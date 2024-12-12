import Hero from "../components/Hero"
import HomeCards from "../components/HomeCards";
import JobListings from "../components/JobListings";
import ViewAllJobs from "../components/ViewAllJobs";


const HomePage = ({jobData}) => {
  return (
    <>
      <Hero />
      <HomeCards />
      <JobListings isHome={true}/>
      <ViewAllJobs />
    </>
  );
}

export default HomePage;