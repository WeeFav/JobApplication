import { Link } from "react-router-dom"

const CompanyListing = ({company}) => {
  return (
    <Link to={`/companies/${company.company_id}`}>
      <div className="bg-white border-2 border-website-blue rounded-lg shadow-md p-6 relative group hover:shadow-lg hover:scale-110 hover:border-website-gold">
        <div className="flex flex-col items-center">
          <div className="w-[100px] h-[100px] rounded-full flex items-center justify-center">
            <img
              src="https://www.svgrepo.com/show/490660/company.svg"
              alt="Profile"
              className="w-[80px] h-[80px] rounded-full mr-4"
            />
          </div>
          <span className="mt-3 text-gray-600 font-medium">
            {company.company_name}
          </span>
        </div>
      </div>
    </Link>
  )
}

export default CompanyListing