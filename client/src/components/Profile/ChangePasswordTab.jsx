import { useState, useContext } from "react"
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import { AccountContext } from "../../App";

const ChangePasswordTab = ({ profileInfo }) => {
  const accountContext = useContext(AccountContext);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [match, setMatch] = useState(true);

  // alert popup
  const [open, setOpen] = useState(false);
  const handleClose = () => {
    setOpen(false);
  };

  const onSubmitFormClick = (e) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      setMatch(false);
    }
    else {
      setMatch(true);
      
      let updatedAccount;
      
      if (!accountContext.isCompany) {
        updatedAccount = {
          account_id: profileInfo.user_id,
          account_password: confirmPassword,
        }
      }
      else {
        updatedAccount = {
          account_id: profileInfo.account_id,
          account_password: confirmPassword,
        }
      }
      
      updatedPasswordHandler(updatedAccount);
      setOpen(true);
    }
  }

  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200 w-[400px]" >
      <form className="flex flex-col" onSubmit={onSubmitFormClick}>
        <label className="text-gray-500">New Password: </label>
        <input
          type="password"
          id="new"
          name="new"
          className="border rounded w-full py-2 px-3 mb-2"
          required
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
        <label className="text-gray-500">Confirm Password: </label>
        <input
          type="password"
          id="confirm"
          name="confirm"
          className="border rounded w-full py-2 px-3 mb-2"
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
        <div className="flex flex-col justify-center items-center">
          {match ? <></> : <p className="text-red-600">Password does not match</p>}
          <button
            className="w-1/2 bg-website-blue hover:bg-website-gold text-white py-1 px-4 rounded-full mt-2"
            type="submit">
            Change Password
          </button>
        </div>
      </form>
      <Snackbar open={open} autoHideDuration={3000} onClose={handleClose} anchorOrigin={{ vertical: 'top', horizontal: 'right' }}>
        <Alert
          onClose={handleClose}
          severity="success"
          variant="filled"
          sx={{ width: '100%' }}
        >
          Succesfully changed password
        </Alert>
      </Snackbar>
    </div>
  )
}

export default ChangePasswordTab

/* 
===============================================================================
API
===============================================================================
*/

// function to change password
const updatedPasswordHandler = async (updatedAccount) => {
  res = await fetch('/api/account', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(updatedAccount)
  });
}