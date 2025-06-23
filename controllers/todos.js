const Inspection = require('../models/Todo')
const User = require('../models/User')
const { validationResult } = require('express-validator');
const cloudinary = require("../middleware/cloudinary");

module.exports = {
    getTodos: async (req,res) => {
        try {
            const pageName = 'Dashboard'
            const loggedInUser = await User.findById(req.user.id).lean()
            const allDrivers = await User.find({role: 'Driver'}).lean();
            
            const limit = 2; // Number of items per page
            const inspections = await Inspection.find({userId: req.user.id}).sort({ createdAt: -1 }).limit(limit).lean()
            const totalInspections = await Inspection.countDocuments({userId: req.user.id});

            res.render('todos.ejs', {
                todos: inspections,
                user: loggedInUser,
                drivers: allDrivers,
                page: pageName,
                hasMore: totalInspections > limit, // Let the template know if there are more items
                currentPage: 1 
            })
        } catch(err) {
            console.log(err)
            res.render('./errors/500.ejs')
        }
    },
    getMoreInspections: async (req, res) => {
        try {
            const limit = 2;
            const page = parseInt(req.query.page) || 1;
            const skip = (page - 1) * limit;

            const inspections = await Inspection.find({ userId: req.user.id })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean();
            
            const totalInspections = await Inspection.countDocuments({userId: req.user.id});
            const hasMore = (page * limit) < totalInspections;

            res.json({ inspections, hasMore });

        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Error fetching more inspections.' });
        }
    },
    createInspection: async (req, res) => {
        // Check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            // If there are errors, send them back to the client
            const errorMessages = errors.array().map(error => error.msg).join(' ');
            return res.status(400).json({ success: false, message: errorMessages });
        }

        try {
            // Data is sent as JSON from the client-side fetch
            const inspectionData = req.body;

            await Inspection.create({
                ...inspectionData,
                userId: req.user.id
            });
            
            console.log('Inspection has been added!');
            
            res.status(201).json({ success: true, message: 'Inspection created successfully.' });

        } catch (err) {
            console.error('Error creating inspection:', err);
            // Check for Mongoose validation error
            if (err.name === 'ValidationError') {
                const messages = Object.values(err.errors).map(val => val.message);
                return res.status(400).json({ success: false, message: messages.join(' ') });
            }
            res.status(500).json({ success: false, message: 'Failed to create inspection report.' });
        }
    },
    deleteInspection: async (req, res) => {
        try {
            const inspection = await Inspection.findOne({ _id: req.params.id, userId: req.user.id });
            
            if (!inspection) {
                console.log('Could not find inspection to delete or user not authorized.');
                return res.redirect('/todos');
            }
            
            await Inspection.deleteOne({ _id: req.params.id });
            console.log('Deleted Inspection');
            res.redirect('/todos');
        } catch (err) {
            console.log(err);
            res.redirect('/todos');
        }
    }
}    