import Hero from "../components/Home/Hero"
import JobListings from "../components/Jobs/JobListings";
import { useState, useContext } from "react"

const HomePage = () => {

  return (
    <div className="flex-grow">
      <section className="mb-8">
        <Hero />
      </section>
      <section className="flex flex-col gap-8 mx-40">
        <div>
          <div className="mb-6">
            <h2 className="text-3xl font-bold text-website-darkGray text-center">
              Recently Applied Jobs
            </h2>
          </div>
        </div>
      </section>
    </div>
  );
}

export default HomePage;