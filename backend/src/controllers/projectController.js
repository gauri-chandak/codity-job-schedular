const pool = require("../config/db");

// CREATE PROJECT
const createProject = async (req, res) => {
    try {
        const { name, description } = req.body;

        if (!name) {
            return res.status(400).json({
                message: "Project name is required"
            });
        }

        // Check if user already has an organization
        const [organizations] = await pool.query(
            `SELECT o.id
             FROM organizations o
             JOIN projects p ON p.organization_id = o.id
             WHERE p.id IN (
                 SELECT id FROM projects
             )
             LIMIT 1`
        );

        let organizationId;

        /*
         * For our simple MVP, create an organization
         * for the user if one doesn't exist.
         *
         * We store the user's organization ID later
         * through a simple lookup.
         */

        // Check organization by user's email/name isn't available
        // in current schema, so create a personal organization.
        const [existingOrg] = await pool.query(
            `SELECT id
             FROM organizations
             WHERE name = ?
             LIMIT 1`,
            [`User ${req.user.userId} Organization`]
        );

        if (existingOrg.length > 0) {
            organizationId = existingOrg[0].id;
        } else {
            const [orgResult] = await pool.query(
                `INSERT INTO organizations (name)
                 VALUES (?)`,
                [`User ${req.user.userId} Organization`]
            );

            organizationId = orgResult.insertId;
        }

        // Create project
        const [result] = await pool.query(
            `INSERT INTO projects
             (organization_id, name, description)
             VALUES (?, ?, ?)`,
            [organizationId, name, description || null]
        );

        res.status(201).json({
            message: "Project created successfully",
            project: {
                id: result.insertId,
                organization_id: organizationId,
                name,
                description: description || null
            }
        });

    } catch (error) {
        console.error("Create project error:", error);

        res.status(500).json({
            message: "Server error"
        });
    }
};


// GET ALL PROJECTS
const getProjects = async (req, res) => {
    try {
        /*
         * For the MVP, retrieve projects belonging
         * to the user's organization.
         */

        const [organizations] = await pool.query(
            `SELECT id
             FROM organizations
             WHERE name = ?`,
            [`User ${req.user.userId} Organization`]
        );

        if (organizations.length === 0) {
            return res.json({
                projects: []
            });
        }

        const organizationId = organizations[0].id;

        const [projects] = await pool.query(
            `SELECT
                id,
                name,
                description,
                created_at,
                updated_at
             FROM projects
             WHERE organization_id = ?
             ORDER BY created_at DESC`,
            [organizationId]
        );

        res.json({
            projects
        });

    } catch (error) {
        console.error("Get projects error:", error);

        res.status(500).json({
            message: "Server error"
        });
    }
};


// GET SINGLE PROJECT
const getProject = async (req, res) => {
    try {
        const projectId = req.params.id;

        const [projects] = await pool.query(
            `SELECT
                p.id,
                p.name,
                p.description,
                p.organization_id,
                p.created_at,
                p.updated_at
             FROM projects p
             JOIN organizations o
                 ON p.organization_id = o.id
             WHERE p.id = ?
             AND o.name = ?`,
            [
                projectId,
                `User ${req.user.userId} Organization`
            ]
        );

        if (projects.length === 0) {
            return res.status(404).json({
                message: "Project not found"
            });
        }

        res.json({
            project: projects[0]
        });

    } catch (error) {
        console.error("Get project error:", error);

        res.status(500).json({
            message: "Server error"
        });
    }
};


module.exports = {
    createProject,
    getProjects,
    getProject
};