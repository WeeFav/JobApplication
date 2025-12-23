import React from 'react'
import { useState, useEffect } from "react"

const SystemCheckTab = () => {
  const [system, setSystem] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    loadSystem(setSystem, setLoading);
  }, []);

  return (
    <div className="flex">
      {loading ? <></> :
        <div className="flex flex-col gap-2">
          <div className={`w-full p-4 text-white text-center font-semibold rounded-xl shadow-md ${system.in_pg_not_qdrant ? "bg-red-600" : "bg-green-600"}`}>
            {`Jobs in database but not qdrant: ${system.in_pg_not_qdrant} issue(s) detected`}
          </div>
          <div className={`w-full p-4 text-white text-center font-semibold rounded-xl shadow-md ${system.in_qdrant_not_pg ? "bg-red-600" : "bg-green-600"}`}>
            {`Jobs in qdrant but not database: ${system.in_qdrant_not_pg} issue(s) detected`}
          </div>
          <div className={`w-full p-4 text-white text-center font-semibold rounded-xl shadow-md ${system.mismatched_scrape_dates ? "bg-red-600" : "bg-green-600"}`}>
            {`Jobs with mismatched scrape date: ${system.mismatched_scrape_dates} issue(s) detected`}
          </div>
        </div>
      }
    </div>
  )
}

export default SystemCheckTab

/* 
===============================================================================
API
===============================================================================
*/
const loadSystem = async (setSystem, setLoading, setSavedSnapshot, setActiveId) => {
  const res = await fetch('/python_api/system_check');
  const data = await res.json();
  setSystem(data);
  setLoading(false);
};