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
            
            const limit = 2;
            const q = req.query.q ? req.query.q.trim() : '';
            let searchFilter = { userId: req.user.id };
            if (q) {
                const regex = new RegExp(q, 'i');
                searchFilter.$or = [
                    { truckTractorNo: regex },
                    { trailerNo: regex },
                    { remarks: regex }
                ];
            }
            const inspections = await Inspection.find(searchFilter).sort({ createdAt: -1 }).limit(limit).lean()
            const totalInspections = await Inspection.countDocuments(searchFilter);

            res.render('todos.ejs', {
                todos: inspections,
                user: loggedInUser,
                drivers: allDrivers,
                page: pageName,
                hasMore: totalInspections > limit, 
                currentPage: 1,
                q
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
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const errorMessages = errors.array().map(error => error.msg).join(' ');
            return res.status(400).json({ success: false, message: errorMessages });
        }

        try {
            const inspectionData = req.body;

            // Sanitize 'other' fields to ensure Boolean
            if (inspectionData.defects) {
                if (inspectionData.defects.truckTractor) {
                    if (inspectionData.defects.truckTractor.other === "" || inspectionData.defects.truckTractor.other === undefined) {
                        inspectionData.defects.truckTractor.other = false;
                    }
                }
                if (inspectionData.defects.trailer) {
                    if (inspectionData.defects.trailer.other === "" || inspectionData.defects.trailer.other === undefined) {
                        inspectionData.defects.trailer.other = false;
                    }
                }
            }

            await Inspection.create({
                ...inspectionData,
                userId: req.user.id
            });
            
            console.log('Inspection has been added!');
            
            res.status(201).json({ success: true, message: 'Inspection created successfully.' });

        } catch (err) {
            console.error('Error creating inspection:', err);
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
    },
    viewInspection: async (req, res) => {
        try {
            const inspection = await Inspection.findOne({ _id: req.params.id, userId: req.user.id }).lean();
            if (!inspection) {
                return res.status(404).render('errors/404');
            }
            const loggedInUser = await User.findById(req.user.id).lean();
            res.render('todos/view', { inspection, user: loggedInUser, page: 'FullReport' });
        } catch (err) {
            console.error('Error fetching inspection:', err);
            res.status(500).render('errors/500');
        }
    },
    searchTodos: async (req, res) => {
        try {
            const q = req.query.q ? req.query.q.trim() : '';
            let searchFilter = { userId: req.user.id };
            if (q) {
                const regex = new RegExp(q, 'i');
                searchFilter.$or = [
                    { truckTractorNo: regex },
                    { trailerNo: regex },
                    { remarks: regex }
                ];
            }
            const inspections = await Inspection.find(searchFilter)
                .sort({ createdAt: -1 })
                .limit(20)
                .lean();
            res.json({ inspections });
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Error searching inspections.' });
        }
    }
}    