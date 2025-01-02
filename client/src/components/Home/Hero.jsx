import { useContext } from "react"
import { AccountContext } from "../../App";

const Hero = () => {
  const accountContext = useContext(AccountContext);
  
  return (
    <div className="bg-website-lightGray py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center">
        <div className="text-center">
          <h1 className="text-4xl font-extrabold text-website-blue sm:text-5xl md:text-6xl">
            {!accountContext.isCompany ? 'Land Your Dream Job, Effortlessly' : 'Find the Perfect Candidate, Faster'}
          </h1>
          <p className="my-4 text-xl text-website-blue">
            {!accountContext.isCompany ?
            'Track applications, discover tailored opportunities, and take control of your career journey'
            :
            'Discover qualified applicants, review tailored profiles, and hire with confidence'
            }
          </p>
        </div>
      </div>
    </div>
  );
}

export default Hero;