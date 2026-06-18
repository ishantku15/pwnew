const token = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJleHAiOjE3ODIzOTAxMTMuNzEyLCJkYXRhIjp7Il9pZCI6IjY2OWUzMzhjOGY5ZDhlYzIzZThlNzJkMCIsInVzZXJuYW1lIjoiNzgzMDMzNzI3MSIsImZpcnN0TmFtZSI6IkFiaGlzaGVrIiwibGFzdE5hbWUiOiJZYWRhdiIsIm9yZ2FuaXphdGlvbiI6eyJfaWQiOiI1ZWIzOTNlZTk1ZmFiNzQ2OGE3OWQxODkiLCJ3ZWJzaXRlIjoicGh5c2ljc3dhbGxhaC5jb20iLCJuYW1lIjoiUGh5c2ljc3dhbGxhaCJ9LCJyb2xlcyI6WyI1YjI3YmQ5NjU4NDJmOTUwYTc3OGM2ZWYiXSwiY291bnRyeUdyb3VwIjoiSU4iLCJ0eXBlIjoiVVNFUiJ9LCJqdGkiOiJra291RTR3ZVJjV3BIbUdPNWtRQWZ3XzY2OWUzMzhjOGY5ZDhlYzIzZThlNzJkMCIsImlhdCI6MTc4MTc4NTMxM30.2w2lMP9BrAhJq5Tt7vrXOyOBM_lGW0tCJnniu_Yogsc';

const jsonStr = JSON.stringify({ myAuth: { token: token } });

const match = jsonStr.match(/(eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)/);
console.log(match ? match[1] : "No match");
