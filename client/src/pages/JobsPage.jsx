import { useEffect } from "react";

const JobsPage = () => {
  console.log("JobsPage");
  useEffect(() => {
    console.log("JobsPage useEffect");
  }, []);

  return (
    <div>JobsPage</div>
  )
}

export default JobsPage