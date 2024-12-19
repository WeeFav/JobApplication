import { useState } from "react"
import { useNavigate } from "react-router-dom";

const DevPage = () => {
  const navigate = useNavigate();

  const [inputText, setInputText] = useState();

  const x = sessionStorage.getItem("id")

  return (
    x ? 
    <>
      <div>welcome {x}</div>
      <button onClick={() => {
        sessionStorage.removeItem("id")
        navigate("/dev")
      }}>
        log out
      </button>
    </>
    :
    <div>
      <input
        type="text"
        id="title"
        name="title"
        className="border rounded w-full py-2 px-3 mb-2"
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
      />
      <button
        onClick={() => {
          sessionStorage.setItem("id", inputText)
          navigate("/dev")
        }}>
      ok
      </button>
    </div>
  )
}

export default DevPage