import React, { useState, useEffect, useContext } from "react";
import { ProgressContext } from "../context/ProgressContext";
import { 
  FiBriefcase, 
  FiCheckSquare, 
  FiThumbsUp, 
  FiX, 
  FiCircle, 
  FiCheck, 
  FiLoader,
  FiAlertTriangle
} from "react-icons/fi";

const DashboardPage = () => {
  const { progressList, clearJobProgress } = useContext(ProgressContext);
  const [totalJobs, setTotalJobs] = useState(0);
  const [totalApplications, setTotalApplications] = useState(0);
  const [totalRecommendations, setTotalRecommendations] = useState(0);
  const [loadingStats, setLoadingStats] = useState(true);

  const fetchStats = async () => {
    try {
      // 1. Fetch scraped jobs
      const jobsRes = await fetch('/server_api/jobs');
      const jobsData = await jobsRes.json();
      setTotalJobs(jobsData.length);

      // 2. Fetch applications
      const appsRes = await fetch('/server_api/applications');
      const appsData = await appsRes.json();
      setTotalApplications(appsData.length);

      // 3. Fetch resumes and recommendations for first resume (if any)
      const resumesRes = await fetch('/server_api/resumes');
      const resumesData = await resumesRes.json();
      if (resumesData && resumesData.length > 0) {
        const recsRes = await fetch(`/server_api/recommendations?resumeId=${resumesData[0].id}`);
        const recsData = await recsRes.json();
        setTotalRecommendations(recsData.length);
      } else {
        setTotalRecommendations(0);
      }
    } catch (e) {
      console.error('Error fetching dashboard stats:', e);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    fetchStats();
    // Poll stats occasionally to capture background changes
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const getStagePercentage = (item) => {
    if (item.status === 'failed') return 100;
    switch (item.currentStage) {
      case 'scraping': return 15;
      case 'postgres': return 40;
      case 'qdrant': return 70;
      case 'recommending': return 90;
      case 'completed': return 100;
      default: return 0;
    }
  };

  const renderStepIcon = (state) => {
    if (state === 'success') {
      return (
        <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center shadow-md">
          <FiCheck className="w-5 h-5" />
        </div>
      );
    }
    if (state === 'running') {
      return (
        <div className="w-8 h-8 rounded-full bg-website-blue text-white flex items-center justify-center shadow-lg shadow-website-blue/20 animate-pulse">
          <FiLoader className="w-5 h-5 animate-spin" />
        </div>
      );
    }
    if (state === 'failed') {
      return (
        <div className="w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center shadow-md">
          <FiX className="w-5 h-5" />
        </div>
      );
    }
    return (
      <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-400 flex items-center justify-center border border-gray-300">
        <FiCircle className="w-4 h-4" />
      </div>
    );
  };

  return (
    <div className="bg-gray-50 flex-grow p-8 overflow-y-auto">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-extrabold text-website-darkGray tracking-tight">Dashboard Overview</h1>
          <p className="text-gray-500 mt-1">Track pipeline stats and background job ingestion tasks.</p>
        </div>

        {/* Overview Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Total Scraped Jobs */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex items-center gap-5 transition-all hover:shadow-md">
            <div className="w-14 h-14 rounded-xl bg-blue-50 text-website-blue flex items-center justify-center">
              <FiBriefcase className="w-7 h-7" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Total Scraped Jobs</p>
              {loadingStats ? (
                <div className="h-8 w-16 bg-gray-100 animate-pulse rounded mt-1" />
              ) : (
                <h3 className="text-3xl font-bold text-gray-800 mt-1">{totalJobs}</h3>
              )}
            </div>
          </div>

          {/* Applied Jobs */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex items-center gap-5 transition-all hover:shadow-md">
            <div className="w-14 h-14 rounded-xl bg-green-50 text-green-600 flex items-center justify-center">
              <FiCheckSquare className="w-7 h-7" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Applied Jobs</p>
              {loadingStats ? (
                <div className="h-8 w-16 bg-gray-100 animate-pulse rounded mt-1" />
              ) : (
                <h3 className="text-3xl font-bold text-gray-800 mt-1">{totalApplications}</h3>
              )}
            </div>
          </div>

          {/* Recommended Jobs */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex items-center gap-5 transition-all hover:shadow-md">
            <div className="w-14 h-14 rounded-xl bg-amber-50 text-website-gold flex items-center justify-center">
              <FiThumbsUp className="w-7 h-7" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Recommended Jobs</p>
              {loadingStats ? (
                <div className="h-8 w-16 bg-gray-100 animate-pulse rounded mt-1" />
              ) : (
                <h3 className="text-3xl font-bold text-gray-800 mt-1">{totalRecommendations}</h3>
              )}
            </div>
          </div>

        </div>

        {/* Job Ingestion Pipeline Section */}
        <div>
          <h2 className="text-xl font-bold text-website-darkGray mb-5 flex items-center gap-2">
            Job Ingestion Progress
            {progressList.filter(p => p.status === 'running').length > 0 && (
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-sky-500"></span>
              </span>
            )}
          </h2>

          {progressList.length === 0 ? (
            <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center flex flex-col items-center justify-center transition-all hover:border-gray-300">
              <FiBriefcase className="w-12 h-12 text-gray-300 mb-3" />
              <h4 className="text-lg font-semibold text-gray-700">No Ingestion History</h4>
              <p className="text-gray-400 text-sm max-w-sm mt-1">
                Start by adding jobs through a URL scrape or manually under the "Add Job" tab.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {progressList.map((item) => {
                const pct = getStagePercentage(item);
                return (
                  <div 
                    key={item.id} 
                    className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 relative overflow-hidden transition-all hover:shadow-md"
                  >
                    
                    {/* Header Row */}
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {item.type === 'url' ? (
                          <span className="bg-blue-50 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider whitespace-nowrap">
                            URL Scrape
                          </span>
                        ) : (
                          <span className="bg-amber-50 text-amber-700 text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider whitespace-nowrap">
                            Manual Entry
                          </span>
                        )}
                        <h4 className="text-base font-bold text-gray-800 truncate" title={item.target}>
                          {item.target}
                        </h4>
                      </div>
                      
                      {/* Clear Button (Visible only when finished/failed) */}
                      {item.status !== 'running' && (
                        <button 
                          onClick={() => clearJobProgress(item.id)}
                          className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                          title="Clear progress"
                        >
                          <FiX className="w-5 h-5" />
                        </button>
                      )}
                    </div>

                    {/* Progress Bar Container */}
                    <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden my-5">
                      <div 
                        className={`h-full transition-all duration-500 ease-out ${
                          item.status === 'failed' ? 'bg-red-500' : 'bg-website-blue'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>

                    {/* Timeline Steps */}
                    <div className="grid grid-cols-4 relative mt-2 text-center">
                      
                      {/* Connecting Line Underneath Icons */}
                      <div className="absolute top-4 left-[12.5%] right-[12.5%] h-0.5 bg-gray-200 -z-10" />

                      {/* Step 1: Scraping */}
                      <div className="flex flex-col items-center">
                        {renderStepIcon(item.stages.scraping)}
                        <span className={`text-xs font-semibold mt-2 ${
                          item.stages.scraping === 'running' ? 'text-website-blue font-bold' :
                          item.stages.scraping === 'success' ? 'text-green-600' :
                          item.stages.scraping === 'failed' ? 'text-red-500' : 'text-gray-400'
                        }`}>
                          {item.type === 'manual' ? 'Scraping (Skipped)' : 'Scraping'}
                        </span>
                      </div>

                      {/* Step 2: Database Ingestion */}
                      <div className="flex flex-col items-center">
                        {renderStepIcon(item.stages.postgres)}
                        <span className={`text-xs font-semibold mt-2 ${
                          item.stages.postgres === 'running' ? 'text-website-blue font-bold' :
                          item.stages.postgres === 'success' ? 'text-green-600' :
                          item.stages.postgres === 'failed' ? 'text-red-500' : 'text-gray-400'
                        }`}>
                          PostgreSQL Insert
                        </span>
                      </div>

                      {/* Step 3: Vector DB Ingestion */}
                      <div className="flex flex-col items-center">
                        {renderStepIcon(item.stages.qdrant)}
                        <span className={`text-xs font-semibold mt-2 ${
                          item.stages.qdrant === 'running' ? 'text-website-blue font-bold' :
                          item.stages.qdrant === 'success' ? 'text-green-600' :
                          item.stages.qdrant === 'failed' ? 'text-red-500' : 'text-gray-400'
                        }`}>
                          Qdrant Insert
                        </span>
                      </div>

                      {/* Step 4: Job Recommendation */}
                      <div className="flex flex-col items-center">
                        {renderStepIcon(item.stages.recommending)}
                        <span className={`text-xs font-semibold mt-2 ${
                          item.stages.recommending === 'running' ? 'text-website-blue font-bold' :
                          item.stages.recommending === 'success' ? 'text-green-600' :
                          item.stages.recommending === 'failed' ? 'text-red-500' : 'text-gray-400'
                        }`}>
                          Recommending
                        </span>
                      </div>

                    </div>

                    {/* Error Banner */}
                    {item.status === 'failed' && (
                      <div className="bg-red-50/50 border border-red-100 rounded-xl p-4 mt-5 flex items-start gap-3">
                        <FiAlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <h5 className="text-sm font-bold text-red-800">Job Ingestion Failed</h5>
                          <p className="text-xs text-red-600 mt-0.5">{item.error || 'Unknown error occurred during processing.'}</p>
                        </div>
                      </div>
                    )}

                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default DashboardPage;