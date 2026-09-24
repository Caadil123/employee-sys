// This file sends requests from React to our Python backend.
// Every page uses "sendRequest" instead of writing fetch() again and again.

// The name we use to save the login token in the browser
const TOKEN_STORAGE_NAME = "login_token";

// Save, read and remove the login token in the browser's storage
export function saveToken(loginToken) {
  localStorage.setItem(TOKEN_STORAGE_NAME, loginToken);
}

export function readToken() {
  return localStorage.getItem(TOKEN_STORAGE_NAME);
}

export function removeToken() {
  localStorage.removeItem(TOKEN_STORAGE_NAME);
}

/**
 * Send a request to the backend and return the answer.
 * Example: await sendRequest("/api/users", "POST", { full_name: "Ali", ... })
 */
export async function sendRequest(address, method = "GET", bodyData = null) {
  // Tell the backend we are sending JSON
  const requestHeaders = { "Content-Type": "application/json" };

  // If the user is logged in, send the token so the backend knows who we are
  const loginToken = readToken();
  if (loginToken) {
    requestHeaders["Authorization"] = `Bearer ${loginToken}`;
  }

  // Send the request
  const answer = await fetch(address, {
    method: method,
    headers: requestHeaders,
    body: bodyData ? JSON.stringify(bodyData) : null,
  });

  // 204 means "done, nothing to send back" (for example after a delete)
  if (answer.status === 204) {
    return null;
  }

  // Read the JSON the backend sent back
  const answerData = await answer.json().catch(() => null);

  // If the backend said something went wrong, throw an error with its message
  if (!answer.ok) {
    const errorMessage = makeErrorMessage(answerData);
    const requestError = new Error(errorMessage);
    requestError.status = answer.status; // keep the status, e.g. 401
    throw requestError;
  }

  return answerData;
}

// Turn the backend's error into one simple sentence we can show on the page
function makeErrorMessage(answerData) {
  // No details at all (for example the backend is not running)
  if (!answerData || !answerData.detail) {
    return "Something went wrong. Please try again.";
  }

  // Our own errors are simple text, e.g. "Wrong email or password"
  if (typeof answerData.detail === "string") {
    return answerData.detail;
  }

  // Form errors (422) are a list. We show the first one, e.g. "email: value is not a valid email"
  const firstProblem = answerData.detail[0];
  const fieldName = firstProblem.loc[firstProblem.loc.length - 1];

  // Our own rules (like Gmail only) start with "Value error, ". We remove that part.
  const problemText = firstProblem.msg.replace("Value error, ", "");
  return `${fieldName}: ${problemText}`;
}
