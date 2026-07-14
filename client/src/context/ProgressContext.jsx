import React, { createContext, useState, useEffect } from 'react';

export const ProgressContext = createContext();

export const ProgressProvider = ({ children }) => {
  const [progressList, setProgressList] = useState(() => {
    try {
      const saved = localStorage.getItem('job_progress_list');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Interrupted jobs on page reload should be marked as failed
        return parsed.map(item => {
          if (item.status === 'running') {
            return {
              ...item,
              status: 'failed',
              currentStage: 'failed',
              stages: {
                ...item.stages,
                [item.currentStage]: 'failed'
              },
              error: 'Interrupted by page reload'
            };
          }
          return item;
        });
      }
    } catch (e) {
      console.error('Error loading progress history:', e);
    }
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem('job_progress_list', JSON.stringify(progressList));
    } catch (e) {
      console.error('Error saving progress history:', e);
    }
  }, [progressList]);

  const clearJobProgress = (id) => {
    setProgressList(prev => prev.filter(item => item.id !== id));
  };

  const addJobByUrl = (url) => {
    const id = Date.now().toString();
    const newItem = {
      id,
      target: url,
      type: "url",
      status: "running",
      currentStage: "scraping",
      stages: {
        scraping: "running",
        postgres: "pending",
        qdrant: "pending",
        recommending: "pending"
      },
      error: null,
      scrapedCount: 0,
      insertedCount: 0,
      skippedCount: 0
    };

    setProgressList(prev => [newItem, ...prev]);

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws_api/scrape_url`);

    ws.onopen = () => {
      ws.send(JSON.stringify({ url }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        setProgressList(prev => prev.map(item => {
          if (item.id !== id) return item;
          
          let updated = { ...item };
          updated.stages = { ...item.stages };

          if (msg.type === "scrape") {
            if (msg.action === "start") {
              updated.stages.scraping = "running";
              updated.currentStage = "scraping";
            } else if (msg.action === "update") {
              updated.scrapedCount = (updated.scrapedCount || 0) + 1;
            } else if (msg.action === "success") {
              updated.stages.scraping = "success";
            } else if (msg.action === "fail") {
              updated.stages.scraping = "failed";
              updated.currentStage = "failed";
              updated.status = "failed";
              updated.error = msg.error || "Scraping failed";
            }
          } else if (msg.type === "insert") {
            if (msg.action === "postgres") {
              updated.stages.scraping = "success";
              updated.stages.postgres = "running";
              updated.currentStage = "postgres";
            } else if (msg.action === "qdrant") {
              updated.stages.postgres = "success";
              updated.stages.qdrant = "running";
              updated.currentStage = "qdrant";
            } else if (msg.action === "completed") {
              updated.insertedCount = msg.inserted_count !== undefined ? msg.inserted_count : (updated.insertedCount || 0) + 1;
              updated.skippedCount = msg.skipped_count !== undefined ? msg.skipped_count : (updated.skippedCount || 0);
            } else if (msg.action === "skipped") {
              updated.insertedCount = msg.inserted_count !== undefined ? msg.inserted_count : (updated.insertedCount || 0);
              updated.skippedCount = msg.skipped_count !== undefined ? msg.skipped_count : (updated.skippedCount || 0) + 1;
            } else if (msg.action === "success") {
              updated.stages.postgres = "success";
              updated.stages.qdrant = "success";
            } else if (msg.action === "fail") {
              const active = updated.currentStage === "qdrant" ? "qdrant" : "postgres";
              updated.stages[active] = "failed";
              updated.currentStage = "failed";
              updated.status = "failed";
              updated.error = msg.error || `Insertion failed during ${active}`;
            }
          } else if (msg.type === "recommend") {
            if (msg.action === "start") {
              updated.stages.postgres = "success";
              updated.stages.qdrant = "success";
              updated.stages.recommending = "running";
              updated.currentStage = "recommending";
            } else if (msg.action === "success") {
              updated.stages.recommending = "success";
              updated.currentStage = "completed";
              updated.status = "success";
            } else if (msg.action === "fail") {
              updated.stages.recommending = "failed";
              updated.currentStage = "failed";
              updated.status = "failed";
              updated.error = msg.error || "Recommendation generation failed";
            }
          }
          return updated;
        }));
      } catch (e) {
        console.error('Error handling WebSocket message:', e);
      }
    };

    ws.onclose = () => {
      setProgressList(prev => prev.map(item => {
        if (item.id === id && item.status === "running") {
          return {
            ...item,
            status: "failed",
            currentStage: "failed",
            stages: {
              ...item.stages,
              [item.currentStage]: "failed"
            },
            error: "Connection closed unexpectedly"
          };
        }
        return item;
      }));
    };
  };

  const addJobsiteScrape = (jobsite, numJobs) => {
    const id = Date.now().toString();
    const newItem = {
      id,
      target: `${jobsite} Scrape`,
      type: "scrape",
      status: "running",
      currentStage: "scraping",
      stages: {
        scraping: "running",
        postgres: "pending",
        qdrant: "pending",
        recommending: "pending"
      },
      error: null,
      scrapedCount: 0,
      insertedCount: 0,
      skippedCount: 0
    };

    setProgressList(prev => [newItem, ...prev]);

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws_api/scrape_jobsite`);

    ws.onopen = () => {
      ws.send(JSON.stringify({ jobsite, numJobs }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        setProgressList(prev => prev.map(item => {
          if (item.id !== id) return item;
          
          let updated = { ...item };
          updated.stages = { ...item.stages };

          if (msg.type === "scrape") {
            if (msg.action === "start") {
              updated.stages.scraping = "running";
              updated.currentStage = "scraping";
            } else if (msg.action === "update") {
              updated.scrapedCount = (updated.scrapedCount || 0) + 1;
            } else if (msg.action === "success") {
              updated.stages.scraping = "success";
            } else if (msg.action === "fail") {
              updated.stages.scraping = "failed";
              updated.currentStage = "failed";
              updated.status = "failed";
              updated.error = msg.error || "Scraping failed";
            }
          } else if (msg.type === "insert") {
            if (msg.action === "postgres") {
              updated.stages.scraping = "success";
              updated.stages.postgres = "running";
              updated.currentStage = "postgres";
            } else if (msg.action === "qdrant") {
              updated.stages.postgres = "success";
              updated.stages.qdrant = "running";
              updated.currentStage = "qdrant";
            } else if (msg.action === "completed") {
              updated.insertedCount = msg.inserted_count !== undefined ? msg.inserted_count : (updated.insertedCount || 0) + 1;
              updated.skippedCount = msg.skipped_count !== undefined ? msg.skipped_count : (updated.skippedCount || 0);
            } else if (msg.action === "skipped") {
              updated.insertedCount = msg.inserted_count !== undefined ? msg.inserted_count : (updated.insertedCount || 0);
              updated.skippedCount = msg.skipped_count !== undefined ? msg.skipped_count : (updated.skippedCount || 0) + 1;
            } else if (msg.action === "success") {
              updated.stages.postgres = "success";
              updated.stages.qdrant = "success";
            } else if (msg.action === "fail") {
              const active = updated.currentStage === "qdrant" ? "qdrant" : "postgres";
              updated.stages[active] = "failed";
              updated.currentStage = "failed";
              updated.status = "failed";
              updated.error = msg.error || `Insertion failed during ${active}`;
            }
          } else if (msg.type === "recommend") {
            if (msg.action === "start") {
              updated.stages.postgres = "success";
              updated.stages.qdrant = "success";
              updated.stages.recommending = "running";
              updated.currentStage = "recommending";
            } else if (msg.action === "success") {
              updated.stages.recommending = "success";
              updated.currentStage = "completed";
              updated.status = "success";
            } else if (msg.action === "fail") {
              updated.stages.recommending = "failed";
              updated.currentStage = "failed";
              updated.status = "failed";
              updated.error = msg.error || "Recommendation generation failed";
            }
          }
          return updated;
        }));
      } catch (e) {
        console.error('Error handling WebSocket message:', e);
      }
    };

    ws.onclose = () => {
      setProgressList(prev => prev.map(item => {
        if (item.id === id && item.status === "running") {
          return {
            ...item,
            status: "failed",
            currentStage: "failed",
            stages: {
              ...item.stages,
              [item.currentStage]: "failed"
            },
            error: "Connection closed unexpectedly"
          };
        }
        return item;
      }));
    };
  };

  const addJobManually = (newJob) => {
    const id = Date.now().toString();
    const newItem = {
      id,
      target: `${newJob.title} at ${newJob.company}`,
      type: "manual",
      status: "running",
      currentStage: "postgres",
      stages: {
        scraping: "success", // Manual addition has no scraping stage
        postgres: "running",
        qdrant: "pending",
        recommending: "pending"
      },
      error: null,
      scrapedCount: 0,
      insertedCount: 0,
      skippedCount: 0
    };

    setProgressList(prev => [newItem, ...prev]);

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws_api/manual_job`);

    ws.onopen = () => {
      ws.send(JSON.stringify({ newJobs: [newJob], type: "manual" }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        setProgressList(prev => prev.map(item => {
          if (item.id !== id) return item;
          
          let updated = { ...item };
          updated.stages = { ...item.stages };

          if (msg.type === "insert") {
            if (msg.action === "postgres") {
              updated.stages.postgres = "running";
              updated.currentStage = "postgres";
            } else if (msg.action === "qdrant") {
              updated.stages.postgres = "success";
              updated.stages.qdrant = "running";
              updated.currentStage = "qdrant";
            } else if (msg.action === "completed") {
              updated.insertedCount = msg.inserted_count !== undefined ? msg.inserted_count : (updated.insertedCount || 0) + 1;
              updated.skippedCount = msg.skipped_count !== undefined ? msg.skipped_count : (updated.skippedCount || 0);
            } else if (msg.action === "skipped") {
              updated.insertedCount = msg.inserted_count !== undefined ? msg.inserted_count : (updated.insertedCount || 0);
              updated.skippedCount = msg.skipped_count !== undefined ? msg.skipped_count : (updated.skippedCount || 0) + 1;
            } else if (msg.action === "success") {
              updated.stages.postgres = "success";
              updated.stages.qdrant = "success";
            } else if (msg.action === "fail") {
              const active = updated.currentStage === "qdrant" ? "qdrant" : "postgres";
              updated.stages[active] = "failed";
              updated.currentStage = "failed";
              updated.status = "failed";
              updated.error = msg.error || `Insertion failed during ${active}`;
            }
          } else if (msg.type === "recommend") {
            if (msg.action === "start") {
              updated.stages.postgres = "success";
              updated.stages.qdrant = "success";
              updated.stages.recommending = "running";
              updated.currentStage = "recommending";
            } else if (msg.action === "success") {
              updated.stages.recommending = "success";
              updated.currentStage = "completed";
              updated.status = "success";
            } else if (msg.action === "fail") {
              updated.stages.recommending = "failed";
              updated.currentStage = "failed";
              updated.status = "failed";
              updated.error = "Recommendation generation failed";
            }
          }
          return updated;
        }));
      } catch (e) {
        console.error('Error handling WebSocket message:', e);
      }
    };

    ws.onclose = () => {
      setProgressList(prev => prev.map(item => {
        if (item.id === id && item.status === "running") {
          return {
            ...item,
            status: "failed",
            currentStage: "failed",
            stages: {
              ...item.stages,
              [item.currentStage]: "failed"
            },
            error: "Connection closed unexpectedly"
          };
        }
        return item;
      }));
    };
  };

  const triggerResumeUpdate = (payload, names) => {
    const id = Date.now().toString();
    const newItem = {
      id,
      target: `Resume Update (${names.join(', ')})`,
      type: "resume",
      status: "running",
      currentStage: "postgres_insert",
      stages: {
        postgres_insert: "running",
        qdrant_query: "pending",
        extract_resume: "pending",
        compute_score: "pending"
      },
      error: null,
      scrapedCount: 0,
      insertedCount: 0,
      skippedCount: 0
    };

    setProgressList(prev => [newItem, ...prev]);

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws_api/resumes`);

    ws.onopen = () => {
      ws.send(JSON.stringify(payload));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        setProgressList(prev => prev.map(item => {
          if (item.id !== id) return item;
          
          let updated = { ...item };
          updated.stages = { ...item.stages };

          if (msg.type === "insert") {
            if (msg.action === "start") {
              updated.stages.postgres_insert = "running";
              updated.currentStage = "postgres_insert";
            } else if (msg.action === "success") {
              updated.stages.postgres_insert = "success";
              // Prep for next step, though name-only update might close connection here
              updated.stages.qdrant_query = "running";
              updated.currentStage = "qdrant_query";
            } else if (msg.action === "fail") {
              updated.stages.postgres_insert = "failed";
              updated.currentStage = "failed";
              updated.status = "failed";
              updated.error = msg.error || "Resume database update failed";
            }
          } else if (msg.type === "recommend") {
            if (msg.action === "qdrant_query_start") {
              updated.stages.postgres_insert = "success";
              updated.stages.qdrant_query = "running";
              updated.currentStage = "qdrant_query";
            } else if (msg.action === "qdrant_query_success") {
              updated.stages.qdrant_query = "success";
              updated.stages.extract_resume = "running";
              updated.currentStage = "extract_resume";
            } else if (msg.action === "extract_start") {
              updated.stages.qdrant_query = "success";
              updated.stages.extract_resume = "running";
              updated.currentStage = "extract_resume";
            } else if (msg.action === "extract_success") {
              updated.stages.extract_resume = "success";
              updated.stages.compute_score = "running";
              updated.currentStage = "compute_score";
            } else if (msg.action === "compute_score_start") {
              updated.stages.extract_resume = "success";
              updated.stages.compute_score = "running";
              updated.currentStage = "compute_score";
            } else if (msg.action === "compute_score_success" || msg.action === "success") {
              updated.stages.postgres_insert = "success";
              updated.stages.qdrant_query = "success";
              updated.stages.extract_resume = "success";
              updated.stages.compute_score = "success";
              updated.currentStage = "completed";
              updated.status = "success";
            } else if (msg.action === "skipped") {
              updated.stages.postgres_insert = "success";
              updated.stages.qdrant_query = "skipped";
              updated.stages.extract_resume = "skipped";
              updated.stages.compute_score = "skipped";
              updated.currentStage = "completed";
              updated.status = "success";
            } else if (msg.action === "fail") {
              const active = updated.currentStage;
              if (updated.stages[active]) {
                updated.stages[active] = "failed";
              }
              updated.currentStage = "failed";
              updated.status = "failed";
              updated.error = msg.error || `Recommendation failed at stage ${active}`;
            }
          }
          return updated;
        }));
      } catch (e) {
        console.error('Error handling WebSocket message:', e);
      }
    };

    ws.onclose = () => {
      setProgressList(prev => prev.map(item => {
        if (item.id === id) {
          if (item.status === "running") {
            if (item.stages.postgres_insert === "success" && item.currentStage === "qdrant_query") {
              return {
                ...item,
                status: "success",
                currentStage: "completed",
                stages: {
                  ...item.stages,
                  qdrant_query: "skipped",
                  extract_resume: "skipped",
                  compute_score: "skipped"
                }
              };
            } else {
              console.log(item.stages.postgres_insert);
              console.log(item.currentStage);
              return {
                ...item,
                status: "failed",
                currentStage: "failed",
                stages: {
                  ...item.stages,
                  [item.currentStage]: "failed"
                },
                error: "Connection closed unexpectedly"
              };
            }
          }
        }
        return item;
      }));
    };
  };

  return (
    <ProgressContext.Provider value={{ progressList, addJobByUrl, addJobsiteScrape, addJobManually, clearJobProgress, triggerResumeUpdate }}>
      {children}
    </ProgressContext.Provider>
  );
};
