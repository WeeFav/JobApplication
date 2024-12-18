import JobListings from "../components/JobListings"
import JobSearchBar from "../components/JobSearchBar"

const AppliedJobsPage = () => {
  return (
    <>
      <section className="mx-40">
        <div className="my-12">
          <h2 className="text-3xl font-bold text-website-darkGray text-center">
            Applied Jobs
          </h2>
        </div>
        <div className="px-7">
          <JobSearchBar />
        </div>
        <div className="mt-10">
          <JobListings />
        </div>
      </section>
    </>
  )
}

export default AppliedJobsPage