
const express = require('express');
const conn = require('./conn');
const app = express();

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));

// Home page ANG UNA NGA PAGE KA WEBSITE
app.get('/', (req, res) => {
    res.render('index');
});


// Register account IF WALA PA ACCOUNT PERO GIVEN NA ANG ACCOUNT SANG ADMIN
app.post('/register', (req, res) => {
    const { email, password } = req.body;

    const sql = `
        INSERT INTO signup (email, password, role)
        VALUES (?, ?, ?)
    `;

    conn.query(sql, [email, password, 'Student'], (err) => {
        if (err) {
            console.error('Registration error:', err);
            return res.status(500).send('Registration failed. Check the terminal for details.');
        }

        res.send(`
            <script>
                alert('Account created successfully!');
                window.location.href = '/login';
            </script>
        `);
    });
});

// Login page
app.get('/login', (req, res) => {
    res.render('login');
});


// Process login
app.post('/login', (req, res) => {
    const { email, password, role } = req.body;

    const sql = `
        SELECT email, role
        FROM signup
        WHERE email = ? AND password = ? AND role = ?
    `;

    conn.query(sql, [email, password, role], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Database error.');
        }

        if (results.length === 0) {
            return res.send(`
                <script>
                    alert('Invalid email, password, or role.');
                    location.href = '/login';
                </script>
            `);
        }

        if (results[0].role === 'Admin') {
            return res.redirect('/admin/renewals');
        }
        
        if (results[0].role === 'Student') {
            return res.redirect(
                '/dashboard?email=' + encodeURIComponent(results[0].email)
            );
        }

        res.status(403).send('Invalid user role.');
    });
});


// View organization details ang box sa dashboard part
//XCITE
app.get('/organization/xcite', (req, res) => {
    const email = req.query.email || '';

    res.render('xcite', { email });
});
//CITE STUDENT COUNCIL
app.get('/organization/cite-student-council', (req, res) => {
    const email = req.query.email || '';

    res.render('cite-council', { email });
});
//CITEMAS
app.get('/organization/citemas', (req, res) => {
    const email = req.query.email || '';

    res.render('citemas', { email });
});

app.get('/organization/cite-multimedia-arts-studio', (req, res) => {
    const email = req.query.email || '';

    res.render('citemas', { email });
});
//F1
app.get('/organization/f1', (req, res) => {
    const email = req.query.email || '';

    res.render('f1', { email });
});


// User dashboard
app.get('/dashboard', (req, res) => {
    const email = req.query.email;

    if (!email) {
        return res.redirect('/login');
    }

    res.render('dashboard', { email });
});

//user renewal
app.get('/renewal', (req, res) => {
    const email = req.query.email;

    if (!email) {
        return res.redirect('/login');
    }

    res.render('renewal', { email });
});


//renewal process going to database PARA E RECORD
app.post('/renewal', (req, res) => {
    const accountEmail = req.body.account_email || req.query.email;

    const {
        fullname,
        year_level,
        org_name,
        org_type,
        president,
        adviser,
        contact_email,
        school_year,
        objectives,
        achievements
    } = req.body;

    if (!accountEmail) {
        return res.status(400).send('Email is missing. Please log in again.');
    }

    if (!fullname || !year_level || !org_name || !org_type ||
        !school_year || !objectives) {
        return res.status(400).send('Please complete all required fields.');
    }

    const sql = `
        INSERT INTO renewals
        (org_id, user_id, fullname, year_level, org_name, org_type,
         school_year, president, adviser, contact_email,
         objectives, achievements, status)
        VALUES (NULL, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending')
    `;

    const values = [
        fullname,
        year_level,
        org_name,
        org_type,
        school_year,
        president || null,
        adviser || null,
        accountEmail,
        objectives,
        achievements || null
    ];

    console.log('Submitting renewal for:', accountEmail);

    conn.query(sql, values, (err, result) => {
        if (err) {
            console.error('Renewal database error:', err);
            return res.status(500).send(
                'Failed to submit renewal. Check your database columns and terminal error.'
            );
        }

        console.log('Renewal submitted. ID:', result.insertId);

        res.send(`
            <script>
                alert('Renewal submitted successfully!');
                window.location.href =
                    '/status?email=${encodeURIComponent(accountEmail)}';
            </script>
        `);
    });
});

//user viewing status of renewal FOR UPDATES
app.get('/status', (req, res) => {
    const email = req.query.email;

    if (!email) {
        return res.redirect('/login');
    }

    const sql = `
        SELECT renewal_id, fullname, org_name, org_type, school_year,
               objectives, achievements, status, admin_remarks,
               submitted_at
        FROM renewals
        WHERE contact_email = ?
        ORDER BY submitted_at DESC
    `;

    conn.query(sql, [email], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Error loading renewal status.');
        }

        res.render('status', {
            renewals: results,
            email: email
        });
    });
});

//user use to delete a pending renewal PWEDE KA USER MA DELETE ANG RENEWAL YA
// IF PENDING PALANG, PERO IF INDE NA PENDING THEN INDE NA MA DELETE KA USER
app.post('/delete/:renewal_id', (req, res) => {
    const id = req.params.renewal_id;
    const email = req.body.email;

    const sql = `
        DELETE FROM renewals
        WHERE renewal_id = ?
        AND contact_email = ?
        AND status = 'Pending'
    `;

    conn.query(sql, [id, email], (err) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Error deleting renewal.');
        }

        res.redirect('/status?email=' + encodeURIComponent(email));
    });
});



// ADMIN DASHBOARD MA SIGNIN KA AS ADMIN 
app.get('/admin/renewals', (req, res) => {
    const sql = 'SELECT * FROM renewals ORDER BY submitted_at DESC';

    conn.query(sql, (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Failed to load applications.');
        }

        res.render('admin-dashboard', {
            renewals: results,
            total: results.length,
            pending: results.filter(r => r.status === 'Pending').length,
            approved: results.filter(r => r.status === 'Approved').length,
            rejected: results.filter(r => r.status === 'Rejected').length
        });
    });
});



/* ADMIN APPROVES OR REJECTS A RENEWAL  DIRI NGA PART IS PARA E APPROVE OR REJECT KAG CHECK ANG RENEWAL FORM KA STUDYANTE*/
app.post('/admin/renewal/:id', (req, res) => {
    const { status, admin_remarks } = req.body;
    const id = req.params.id;

    if (!['Pending', 'Approved', 'Rejected'].includes(status)) {
        return res.status(400).send('Invalid status.');
    }

    const sql = `
        UPDATE renewals
        SET status = ?, admin_remarks = ?
        WHERE renewal_id = ?
    `;

    conn.query(sql, [status, admin_remarks || null, id], (err) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Failed to update application.');
        }

        res.redirect('/admin/renewals');
    });
});


// Logout BBYE
app.get('/logout', (req, res) => {
    res.send(`
        <script>
            alert('Are you sure you want to logout on this device?');
            window.location.href = '/login';
        </script>
    `);
});


// Start server MEOW
app.listen(1000, () => {
    console.log('Server running at 1000');
});
