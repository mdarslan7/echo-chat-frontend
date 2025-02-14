import { useState } from "react";

export default function SignUp() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSignup = async (e) => {
    e.preventDefault();

    const userData = {
      username,
      email,
      password,
    };

    try {
      const res = await fetch("https://echo-chat-backend.onrender.com/api/auth/local/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
      });

      const data = await res.json();
      if (data.jwt) {
        localStorage.setItem("jwt", data.jwt); 
        alert("Signup successful!");
        window.location.href = "/chat"; 
      } else {
        alert("Signup failed: " + data.error.message);
      }
    } catch (error) {
      console.error("Signup Error:", error);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 text-white">
      <div className="w-full max-w-md p-8 space-y-6 border border-gray-300 rounded-lg bg-white text-black">
        <h2 className="text-2xl font-bold text-center">Sign Up</h2>
        <form className="space-y-4">
          <div>
            <label className="block text-sm font-medium" htmlFor="text">
              Username
            </label>
            <input
              type="text"
              onChange={(e) => setUsername(e.target.value)}
              id="text"
              className="w-full p-2 mt-1 bg-white border border-gray-400 rounded focus:outline-none focus:border-gray-600"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium" htmlFor="email">
              Email
            </label>
            <input
              type="email"
              onChange={(e) => setEmail(e.target.value)}
              id="email"
              className="w-full p-2 mt-1 bg-white border border-gray-400 rounded focus:outline-none focus:border-gray-600"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium" htmlFor="password">
              Password
            </label>
            <input
              type="password"
              onChange={(e) => setPassword(e.target.value)}
              id="password"
              className="w-full p-2 mt-1 bg-white border border-gray-400 rounded focus:outline-none focus:border-gray-600"
              required
            />
          </div>
          <button
            type="submit"
            onClick={handleSignup}
            className="w-full p-2 mt-4 bg-black text-white font-medium rounded hover:bg-gray-800"
          >
            Sign Up
          </button>
        </form>
      </div>
    </div>
  );
}
