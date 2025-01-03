import { AccountContext } from "../../App";
import { useContext } from "react"
import { useNavigate } from "react-router-dom";

const DeleteAccountTab = ({ profileInfo }) => {
  const accountContext = useContext(AccountContext);
  const navigate = useNavigate();
  
  const onDeleteClick = async () => {
    const confirm = window.confirm('Are you sure you want to delete this account?');

    if (confirm) {
      if (!accountContext.isCompany) {
        await deleteAccountHandler(profileInfo.user_id);
      }
      else {
        await deleteAccountHandler(profileInfo.account_id);
      }

      sessionStorage.clear();
      accountContext.setID(NaN);
      accountContext.setIsCompany(NaN);
      navigate('/login');
    }
  }

  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200 w-[400px]">
      <div className="flex flex-col justify-center items-center">
        <button
          className="w-1/2 bg-website-blue hover:bg-website-gold text-white py-1 px-4 rounded-full mt-2"
          onClick={onDeleteClick}>
          Delete Account
        </button>
      </div>
    </div>

  )
}

export default DeleteAccountTab

const deleteAccountHandler = async (account_id) => {
  await fetch(`/api/account?account_id=${account_id}`, {
    method: 'DELETE'
  });
}