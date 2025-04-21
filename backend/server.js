require("dotenv").config();
const express = require("express");
const mysql = require("mysql");
const multer = require("multer");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");
const session = require("express-session");
const MySQLStore = require("express-mysql-session")(session);

const app = express();
const PORT = 3000;

// Enable JSON parsing & CORS
app.use(express.json());
app.use(cors());

// Session store using MySQL
const sessionStore = new MySQLStore({
    host: "localhost",
    user: "root",
    password: "Suchindrum@123", // Replace with your actual DB password
    database: "career",
    port: 3306,
    clearExpired: true,
    checkExpirationInterval: 900000, // Cleanup expired sessions every 15 minutes
    expiration: 86400000, // 1 day session expiration
});

// Initialize session middleware
app.use(session({
    secret: "your_secret_key", // Change this to a secure random string
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: { secure: false, httpOnly: true, maxAge: 86400000 } // 1-day session
}));

// Serve static files (frontend)
app.use(express.static(path.join(__dirname, "../frontend")));

// Configure Multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = "./uploads";
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + "-" + file.originalname);
    }
});
const upload = multer({ storage });

// Database connection
const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "Suchindrum@123", // Replace with your actual DB password
    database: "career",
    port: 3306
});

db.connect(err => {
    if (err) throw err;
    console.log("MySQL Connected...");
});

// Register API
app.post("/register", upload.single("profilePic"), async (req, res) => {
    try {
        const { fullName, email, password, phone, role } = req.body;
        if (!fullName || !email || !password || !phone) {
            return res.status(400).json({ message: "All fields are required" });
        }
        const profilePic = req.file ? req.file.filename : null;

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert into database
        const sql = "INSERT INTO users (name, email, password, phone, role, profilePic) VALUES (?, ?, ?, ?, ?, ?)";
        db.query(sql, [fullName, email, hashedPassword, phone, role, profilePic], (err, result) => {
            if (err) {
                console.error("Database error:", err);
                return res.status(500).json({ message: "Database error" });
            }
            res.json({ message: "User registered successfully!" });
        });
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// Login API with session management
app.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }

        const sql = "SELECT * FROM users WHERE email = ?";
        db.query(sql, [email], async (err, result) => {
            if (err) {
                console.error("Database error:", err);
                return res.status(500).json({ message: "Database error" });
            }

            if (result.length === 0) {
                return res.status(404).json({ message: "User not found" });
            }

            const user = result[0];
            const isMatch = await bcrypt.compare(password, user.password);

            if (isMatch) {
                // Store user session
                req.session.user = {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role
                };
                console.log(`New user session started with id ${user.id}`);
                res.json({ message: "Login successful", role: user.role });
            } else {
                res.status(401).json({ message: "Invalid credentials" });
            }
        });
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// Check session (to verify if user is logged in)
app.get("/session", (req, res) => {
    if (req.session.user) {
        res.json({ loggedIn: true, user: req.session.user });
    } else {
        res.json({ loggedIn: false });
    }
});
app.get("/profile", (req, res) => {
    if (!req.session.user?.id) {
        return res.status(401).json({ success: false, message: "Unauthorized. Please log in." });
    }

    const sql = "SELECT id, name, email, role, phone, profilePic, created_at, nature FROM users WHERE id = ? LIMIT 1";
    db.query(sql, [req.session.user.id], (err, result) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).json({ success: false, message: "Database error" });
        }

        if (result.length > 0) {
            return res.json({ success: true, user: result[0] });
        }

        return res.status(404).json({ success: false, message: "User not found" });
    });
});
app.post("/apply", (req, res) => {
    const user_id = req.session?.user?.id;

    if (!user_id) {
        return res.status(401).json({ success: false, message: "User not authenticated" });
    }

    // Destructure the required fields from the request body
    const {
        full_name,
        dob,
        job_id,
        email,
        phone,
        yrs_of_experience,
        role, // Maps to `nature_1`
        resume_link,
        title, // Job title
        description, // Job description
        loc, // Job location
        salary, // Job salary
        posted_at, // Date job posted
        company // Company name
    } = req.body;
 // Add this line to inspect the data

    // Validate required fields
    if (![full_name, dob, job_id, email, phone, yrs_of_experience, role, resume_link, title, description, loc, salary, posted_at, company].every(Boolean)) {
      
        return res.status(400).json({ success: false, message: "All fields are required" });
    }
     // Convert to MySQL DATETIME format
    const mysqlPostedAt = new Date(posted_at).toISOString().slice(0, 19).replace('T', ' ');
    const status="Pending";
    // SQL query to insert application data into the database
    const sql = `
        INSERT INTO application(
            user_id, job_id, full_name, dob, email, phone,
            resume_link, nature_1, yrs_of_experience,
            title, description, loc, salary, posted_at, company,status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
        user_id,
        job_id,
        full_name,
        dob,
        email,
        phone,
        resume_link,
        role, // Role maps to nature_1
        yrs_of_experience,
        title, // Added job title
        description, // Added job description
        loc, // Added job location
        salary, // Added job salary
        mysqlPostedAt, // Added posted date
        company,
        status // Added company name
    ];

    // Execute the SQL query
    db.query(sql, values, (err, result) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).json({ success: false, message: "Database error" });
        }

        // Respond with a success message and the new application ID
        res.status(201).json({
            success: true,
            message: `Application submitted successfully for Job ID: ${job_id} by ${full_name}!`,
            application_id: result.insertId
        });
    });
});


app.post("/post_job", (req, res) => {
    if (!req.session.user?.id) {
        return res.status(401).json({ success: false, message: "User not authenticated" });
    }

    try {
        const {title,company,role,location,salary,description} = req.body;
        const user_id = req.session.user.id; // Retrieve user_id from session

        if (!title|| !company || !role || !location || !salary || !description) {
            return res.status(400).json({ success: false, message: "All fields are required" });
        }

        const sql = `
            INSERT INTO jobs(user_id,title,description,loc,salary,company,role) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

        db.query(sql, [user_id, title,description,location,salary,company,role], (err, result) => {
            if (err) {
                console.error("Database error:", err);
                return res.status(500).json({ success: false, message: "Database error" });
            }

            res.status(201).json({ 
                success: true, 
                message: `Application submitted successfully for Job !`, 
                application_id: result.insertId 
            });
        });
    } catch (error) {
        console.error("Server error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});
app.get("/jobs", (req, res) => {
    // Get the user ID from the session
    const userId = req.session.user.id;

    if (!userId) {
        return res.status(401).json({ error: "User not logged in." });
    }

    // Query to select jobs that the user has NOT applied to
    const query = `
        SELECT j.job_id, j.title, j.company, j.loc AS location, j.salary, j.posted_at, j.role
        FROM jobs j
        WHERE j.job_id NOT IN (
            SELECT job_id FROM application WHERE user_id = ?
        )
    `;

    db.query(query, [userId], (err, results) => {
        if (err) {
            console.error("Error fetching jobs:", err);
            return res.status(500).json({ error: "Failed to fetch jobs." });
        }

        if (results.length === 0) {
            return res.status(404).json({ message: "No available jobs for you." });
        }

        res.json(results);
    });
});

app.get("/my-jobs", (req, res) => {
    try {
        // Check if session or user ID is missing
        if (!req.session || !req.session.user || !req.session.user.id) {
            return res.status(401).json({
                success: false,
                error: "Unauthorized. Please log in to view your jobs."
            });
        }

        const userId = req.session.user.id;

        const query = `
            SELECT job_id, title, company, loc AS location, salary, posted_at, role, description
            FROM jobs
            WHERE user_id = ?
        `;

        db.query(query, [userId], (err, results) => {
            if (err) {
                console.error("Database query error:", err);
                return res.status(500).json({
                    success: false,
                    error: "An error occurred while retrieving your jobs. Please try again later."
                });
            }

            if (results.length === 0) {
                return res.status(200).json({
                    success: true,
                    message: "No jobs posted yet.",
                    jobs: []
                });
            }

            res.status(200).json({
                success: true,
                jobs: results
            });
        });

    } catch (error) {
        console.error("Unexpected error:", error);
        res.status(500).json({
            success: false,
            error: "Unexpected server error. Please contact support."
        });
    }
});
app.get('/career-paths', (req, res) => {
    const userId = req.session.user.id;  // Assume user_id is stored in the session

    // Query to fetch career paths (job1, job2, job3) from the `suggested` table
    const query = 'SELECT job1, job2, job3 FROM suggested WHERE user_id = ?';

    db.query(query, [userId], (err, results) => {
        if (err) {
            console.error('Error fetching career paths:', err);
            return res.status(500).json({ error: 'Failed to load career paths' });
        }

        // Extract the career paths from the result
        const careerPaths = results[0] ? [results[0].job1, results[0].job2, results[0].job3] : [];

        // Send the career paths as JSON response
        res.json(careerPaths);
    });
});


 
app.patch('/applicants/update-status', (req, res) => {
    const { user_id, status } = req.body;
  
    // Input validation
    if (!user_id) {
      return res.status(400).json({ success: false, message: "User ID is required" });
    }
    if (!status || (status !== "Accepted" && status !== "Rejected")) {
      return res.status(400).json({ success: false, message: "Status must be either 'Accepted' or 'Rejected'" });
    }
  
    // SQL query to update the user's status
    const sql = "UPDATE application SET status = ? WHERE user_id = ?";
    
    // Database query
    db.query(sql, [status, user_id], (err, result) => {
      // Database error handling
      if (err) {
        console.error("DB error:", err);
        return res.status(500).json({ success: false, message: "Database error. Please try again later." });
      }
  
      // No rows affected, meaning user was not found
      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: "User not found" });
      }
  
      // Success response
      res.json({ success: true, message: "Status updated successfully" });
    });
  });
  

app.get('/applicants', (req, res) => {
    const jobId = parseInt(req.query.job_id);
  
    if (isNaN(jobId)) {
      return res.status(400).json({ error: 'Invalid job_id parameter' });
    }
  
    // Query to get applicants based on job_id
    const query = 'SELECT * FROM application WHERE job_id = ? AND status!="Rejected"';
    db.query(query, [jobId], (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Database query failed' });
      }
  
      // If no applicants found, return a message
      if (results.length === 0) {
        return res.status(404).json({ message: 'No applicants found for this job ID' });
      }
  
      // Send the results back as a JSON response
      res.json({ applicants: results });
    });
  });
  app.get('/applicants1', (req, res) => {
    const userId = req.session.user.id;
   

  
    const query = 'SELECT * FROM application WHERE user_id = ?';
    db.query(query, [userId], (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Database query failed' });
      }
  
      // If no applicants found, return a message
      if (results.length === 0) {
        return res.status(404).json({ message: 'No applicantions found for this user ID' });
      }
  
      // Send the results back as a JSON response
      res.json({ applicants: results });
    });
  });




// Logout API
app.post("/logout", (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).json({ message: "Logout failed" });
        }
        res.json({ message: "Logged out successfully" });
    });
});
app.post('/submit-survey', async (req, res) => {
    try {
        const values = req.body.data;  // Get the survey data from the request
        const userId = req.session.user.id;  // Assume user_id is stored in the session

        if (!userId) {
            return res.status(400).json({ error: 'User not logged in' });  // Ensure user is logged in
        }

        const params = new URLSearchParams();
        values.forEach(val => params.append('data[]', val));  // Prepare the survey data for the Python script

        // Call the Python API to process the survey data
        const pythonResponse = await fetch('http://localhost:5001/run-python?' + params.toString(), {
            method: 'GET'
        });

        if (!pythonResponse.ok) {
            // If the response from the Python script is not ok, throw an error
            throw new Error('Python API call failed with status ' + pythonResponse.status);
        }

        const result = await pythonResponse.json();  // Get the result from Python script

        console.log('Python API response:', result);  // Log the response for debugging

        // Check if the result is an object and contains the "message" field
        if (result && result.message) {
            // Split the message into an array of job suggestions
            result.jobSuggestions = result.message.split(',').map(job => job.trim());
        } else {
            throw new Error('Unexpected result format from Python API');
        }

        // Ensure the result contains at least 3 job suggestions
        if (!Array.isArray(result.jobSuggestions) || result.jobSuggestions.length < 3) {
            throw new Error('Unexpected result format from Python API');
        }

        // Assume the result contains an array of job suggestions: [job1, job2, job3]
        const [job1, job2, job3] = result.jobSuggestions;  // Destructure the result into job1, job2, and job3

        // Save the career suggestions (job1, job2, job3) to the 'suggested' table in the database
        const query = 'INSERT INTO suggested (user_id, job1, job2, job3) VALUES (?, ?, ?, ?)';

        db.query(query, [userId, job1, job2, job3], (err, results) => {
            if (err) {
                console.error('Error inserting career suggestions:', err);
                return res.status(500).json({ error: 'Failed to insert career suggestions into the database' });
            }

            // If the query affects no rows, that might indicate an issue
            if (results.affectedRows === 0) {
                return res.status(500).json({ error: 'Failed to insert career suggestions into the database' });
            }

            // Send the result back to the client
            res.json(result.jobSuggestions);
            console.log('Saved career suggestions:', result.jobSuggestions);
        });

    } catch (err) {
        console.error('Error:', err.message);  // Log the error message for better debugging
        res.status(500).json({ error: 'Something went wrong', details: err.message });
    }
});
app.delete('/delete-job/:jobId', (req, res) => {
    const jobId = req.params.jobId;
  
    // Check if jobId is provided
    if (!jobId) {
      return res.status(400).json({ message: 'Job ID is required' });
    }
  
    // Delete related applications first
    const deleteApplicationsQuery = 'DELETE FROM application WHERE job_id = ?';
    
    db.query(deleteApplicationsQuery, [jobId], (err, result) => {
      if (err) {
        console.error('Error while deleting applications:', err);
        return res.status(500).json({ message: 'Internal server error while deleting applications' });
      }
  
      // Delete the job from the jobs table
      const deleteJobQuery = 'DELETE FROM jobs WHERE job_id = ?';
      
      db.query(deleteJobQuery, [jobId], (err, result) => {
        if (err) {
          console.error('Error while deleting job:', err);
          return res.status(500).json({ message: 'Internal server error while deleting job' });
        }
  
        // Check if job deletion was successful
        if (result.affectedRows > 0) {
          return res.json({ success: true, message: 'Job and related applications deleted successfully' });
        } else {
          return res.status(404).json({ success: false, message: 'Job not found' });
        }
      });
    });
  });
  

  
  
  
  
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "../frontend", "dashboard.html")));
app.get("/apply", (req, res) => res.sendFile(path.join(__dirname, "../frontend", "application.html")));
app.get("/dashboard", (req, res) => res.sendFile(path.join(__dirname, "../frontend", "dashboard.html")));
app.get("/register", (req, res) => res.sendFile(path.join(__dirname, "../frontend", "register.html")));
app.get("/login", (req, res) => res.sendFile(path.join(__dirname, "../frontend", "login.html")));
app.get("/career-quiz", (req, res) => res.sendFile(path.join(__dirname, "../frontend", "quiz.html")));
app.get("/job-listings", (req, res) => res.sendFile(path.join(__dirname, "../frontend", "job.html")));
app.get("/contact", (req, res) => res.sendFile(path.join(__dirname, "../frontend", "contact.html")));
app.get("/jobs", (req, res) => res.sendFile(path.join(__dirname, "../frontend", "joblist.html")));
app.get("/my-job", (req, res) => res.sendFile(path.join(__dirname, "../frontend", "my-job.html")));

// Start server
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
