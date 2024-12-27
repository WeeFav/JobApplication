import CompanyListing from "../components/Companies/CompanyListing"
import { useContext, useState } from "react";
import { CompanysContext } from "../App";

const CompaniesPage = () => {
  const { companys, loading } = useContext(CompanysContext);

  return (
    <section className="mx-60 mb-12 flex-grow">
      <div className="my-12">
        <h2 className="text-3xl font-bold text-website-darkGray text-center">
          Companies
        </h2>
      </div>
      <div className="grid grid-cols-5 gap-8">
        {loading ? <h2>loading</h2> :
          <>
            {companys.map((company) => (<CompanyListing key={company.company_id} company={company}/>))}
          </>
        }
      </div>
    </section>
  )
}

export default CompaniesPage