import { execSync } from "child_process";

console.log("Installing backend dependencies...");
execSync("npm --prefix backend install", { stdio: "inherit" });

console.log("Installing frontend dependencies...");
execSync("npm --prefix frontend install", { stdio: "inherit" });

console.log("Building frontend bundle...");
execSync("npm --prefix frontend run build", { stdio: "inherit" });
