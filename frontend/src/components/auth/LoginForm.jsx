// // src/components/auth/LoginForm.jsx
// import React, { useState, useContext, useRef, useEffect, use } from "react";
// import { Lock, User, Factory } from "lucide-react";
// import { useNavigate, useLocation} from "react-router-dom";
// import { UserContext } from "../context/UserContext";
// import {useUser} from '../context/UserContext'

// export const LoginForm = () => {
//   // const { login, fetchMe } = useContext(UserContext);
//   const {login} = useUser();
//   const navigate = useNavigate();
//   const location = useLocation();
//   const from = location.state?.from?.pathname || null;
    
//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");
//   const [error, setError] = useState("");
//   const [loading, setLoading] = useState(false);

//   const emailRef = useRef(null);
//   useEffect(() => { emailRef.current?.focus(); }, []);

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setError("");
//     setLoading(true);

//     try {
//       const res = await login(email.trim(), password);

//       if (!res) {
//         setError("Unexpected response from server. Try again.");
//         return;
//       }
//       if (!res.success) {
//         setError(res.message || "Invalid email or password");
//         return;
//       }

//       // If login returned a user object, use it. Otherwise call fetchMe to hydrate context.
//       // const user = res.user ?? (await fetchMe()).user;
//       // if (user && user.role) {
//       //   navigate(`/${user.role}`);
//       // } else {
//       //   // fallback to home
//       //   navigate("/");
//       // }

//       navigate(from || `/${res.user?.role || 'admin'}`);
//     } catch (err) {
//       setError(err?.message || "Login failed. Try again.");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const demoCredentials = [
//     { role: "admin", email: "admin@company.com", password: "admin123" },
//     { role: "worker", email: "worker@company.com", password: "worker123" },
//   ];

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
//       <div className="max-w-md w-full">
//         <div className="bg-white rounded-2xl shadow-xl p-8">
//           <div className="text-center mb-8">
//             <div className="mx-auto w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mb-4">
//               <Factory className="w-8 h-8 text-white" />
//             </div>
//             <h1 className="text-2xl font-bold text-gray-900">ClothFlow</h1>
//             <p className="text-gray-600 mt-2">Manufacturing Management System</p>
//           </div>

//           <form onSubmit={handleSubmit} className="space-y-6" noValidate>
//             <div>
//               <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
//                 Email Address
//               </label>
//               <div className="relative">
//                 <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
//                 <input
//                   ref={emailRef}
//                   id="email"
//                   name="email"
//                   type="email"
//                   value={email}
//                   onChange={(e) => setEmail(e.target.value)}
//                   className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
//                   placeholder="Enter your email"
//                   required
//                 />
//               </div>
//             </div>

//             <div>
//               <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
//                 Password
//               </label>
//               <div className="relative">
//                 <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
//                 <input
//                   id="password"
//                   name="password"
//                   type="password"
//                   value={password}
//                   onChange={(e) => setPassword(e.target.value)}
//                   className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
//                   placeholder="Enter your password"
//                   required
//                 />
//               </div>
//             </div>

//             {error && (
//               <div aria-live="assertive" className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm" role="alert">
//                 {error}
//               </div>
//             )}

//             <button
//               type="submit"
//               disabled={loading}
//               aria-busy={loading}
//               className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
//             >
//               {loading ? "Signing in..." : "Sign In"}
//             </button>
//           </form>

//           <div className="mt-8 pt-6 border-t border-gray-200">
//             <p className="text-sm text-gray-600 mb-3">Demo Credentials:</p>
//             <div className="space-y-2">
//               {demoCredentials.map((cred, index) => (
//                 <button
//                   key={index}
//                   type="button"
//                   onClick={() => {
//                     setEmail(cred.email);
//                     setPassword(cred.password);
//                     setError("");
//                   }}
//                   className="w-full text-left p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
//                 >
//                   <div className="flex justify-between items-center">
//                     <span className="font-medium text-gray-700">{cred.role}</span>
//                     <span className="text-xs text-gray-500">Click to use</span>
//                   </div>
//                   <div className="text-sm text-gray-600">{cred.email}</div>
//                 </button>
//               ))}
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };



// src/components/auth/LoginForm.jsx
import React, { useState, useRef, useEffect } from "react";
import { Lock, User, Factory, Shield, Zap, Users, BarChart3 } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useUser } from "../context/UserContext";
import { motion } from "framer-motion";

export const LoginForm = () => {
  const { login } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || null;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const emailRef = useRef(null);
  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await login(email.trim(), password);

      if (!res) {
        setError("Unexpected response from server. Try again.");
        return;
      }
      if (!res.success) {
        setError(res.message || "Invalid email or password");
        return;
      }

      navigate(from || `/${res.user?.role || "admin"}`);
    } catch (err) {
      setError(err?.message || "Login failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const demoCredentials = [
    { role: "Admin", email: "admin@company.com", password: "admin123", icon: Shield },
    { role: "Worker", email: "worker@company.com", password: "worker123", icon: Users },
  ];

  const features = [
    { icon: Zap, title: "Real-time Tracking", desc: "Monitor production in real-time" },
    { icon: Users, title: "Team Management", desc: "Efficient workforce coordination" },
    { icon: BarChart3, title: "Analytics", desc: "Data-driven insights" },
  ];

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Content */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            backgroundRepeat: 'repeat'
          }}></div>
        </div>
        
        <div className="relative z-10 flex flex-col justify-center px-12 py-16 text-white">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center mb-8">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center mr-4">
                <Factory className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">ClothFlow</h1>
                <p className="text-blue-200 text-sm">Manufacturing Excellence</p>
              </div>
            </div>
            
            <h2 className="text-4xl font-bold mb-6 leading-tight">
              Streamline Your
              <br />
              <span className="text-blue-300">Manufacturing Process</span>
            </h2>
            
            <p className="text-xl text-blue-100 mb-12 leading-relaxed">
              Manage orders, track production, and optimize your textile manufacturing workflow with our comprehensive management system.
            </p>
            
            <div className="space-y-6">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 + index * 0.1 }}
                    className="flex items-center space-x-4"
                  >
                    <div className="w-10 h-10 bg-white/10 backdrop-blur-sm rounded-lg flex items-center justify-center">
                      <Icon className="w-5 h-5 text-blue-300" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{feature.title}</h3>
                      <p className="text-blue-200 text-sm">{feature.desc}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gray-50">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="w-full max-w-md"
        >
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center mb-8">
              <div className="mx-auto w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center mb-4 shadow-lg">
                <Factory className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Welcome Back</h2>
              <p className="text-gray-600 mt-2">Sign in to your account</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6" noValidate>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    ref={emailRef}
                    id="email"
                    name="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                    placeholder="Enter your email"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    id="password"
                    name="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                    placeholder="Enter your password"
                    required
                  />
                </div>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  aria-live="assertive"
                  className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm"
                  role="alert"
                >
                  {error}
                </motion.div>
              )}

              <button
                type="submit"
                disabled={loading}
                aria-busy={loading}
                className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Signing in...
                  </div>
                ) : (
                  "Sign In"
                )}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-600 mb-4 text-center">Demo Credentials</p>
              <div className="space-y-3">
                {demoCredentials.map((cred, idx) => {
                  const Icon = cred.icon;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setEmail(cred.email);
                        setPassword(cred.password);
                        setError("");
                      }}
                      className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors duration-200 border border-gray-200 hover:border-gray-300"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Icon className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="text-left">
                          <div className="text-sm font-medium text-gray-700">{cred.role}</div>
                          <div className="text-xs text-gray-500">{cred.email}</div>
                        </div>
                      </div>
                      <div className="text-xs text-blue-600 font-medium">Use</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
