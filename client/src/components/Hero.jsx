const Hero = ({title="Become a React Dev", subtitle="Find the React job that fits your skills and needs"}) => {
  return (
    <div className="bg-website-lightGray py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center">
        <div className="text-center">
          <h1 className="text-4xl font-extrabold text-website-blue sm:text-5xl md:text-6xl">
            {title}
          </h1>
          <p className="my-4 text-xl text-website-blue">
            {subtitle}
          </p>
        </div>
      </div>
    </div>
  );
}

export default Hero;