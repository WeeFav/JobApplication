import Hero from "../components/Hero"
import JobListings from "../components/JobListings";
import ViewAllJobs from "../components/ViewAllJobs";


const HomePage = ({ jobData }) => {
  return (
    <>
      <section className="mb-8">
        <Hero />
      </section>
      <section className="flex flex-col gap-8 mx-40">
        <div>
          <div className="mb-6">
            <h2 className="text-3xl font-bold text-website-darkGray text-center">
              Recent Jobs
            </h2>
          </div>
          <JobListings isHome={true} />
        </div>
        <div>
          <div className="mb-6">
            <h2 className="text-3xl font-bold text-website-darkGray text-center">
              Recent Jobs
            </h2>
          </div>
          <JobListings isHome={true} />
        </div>
      </section>
      {/* <ViewAllJobs /> */}
    </>
  );
}

export default HomePage;