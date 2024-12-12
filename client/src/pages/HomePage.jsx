import Hero from "../components/Hero"
import HomeCards from "../components/HomeCards";
import JobListings from "../components/JobListings";
import ViewAllJobs from "../components/ViewAllJobs";


const HomePage = ({jobData}) => {
  return (
    <>
      <Hero />
      <HomeCards />
      <JobListings jobData={jobData.jobs}/>
      <ViewAllJobs />
    </>
  );
}

export default HomePage;