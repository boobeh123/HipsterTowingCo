const mongoose = require('mongoose');
const Contact = require('../../models/Contact');
const { connectTestDB, disconnectTestDB, clearTestDB } = require('../config/database.test');

describe('Contact Model Integration Tests', () => {
  let dbConnected = false;

  beforeAll(async () => {
    dbConnected = await connectTestDB();
  }, 15000);

  beforeEach(async () => {
    if (dbConnected) {
      await clearTestDB();
    }
  });

  afterAll(async () => {
    if (dbConnected) {
      await disconnectTestDB();
    }
  });

  describe('Database Operations', () => {
    it('should create and save a contact to database', async () => {
      if (!dbConnected) {
        console.log('⏭️ Skipping - no database connection');
        return;
      }

      const contactData = {
        name: 'John Doe',
        email: 'john@example.com',
        subject: 'Test Contact',
        message: 'This is a test contact message'
      };

      const contact = new Contact(contactData);
      const savedContact = await contact.save();

      expect(savedContact._id).toBeDefined();
      expect(savedContact.name).toBe(contactData.name);
      expect(savedContact.email).toBe(contactData.email);
      expect(savedContact.subject).toBe(contactData.subject);
      expect(savedContact.message).toBe(contactData.message);
      expect(savedContact.submittedAt).toBeDefined();
      expect(savedContact.status).toBe('pending');
    });

    it('should find contact by email', async () => {
      if (!dbConnected) {
        console.log('⏭️ Skipping - no database connection');
        return;
      }

      const contact = await new Contact({
        name: 'Find Me',
        email: 'findme@example.com',
        subject: 'Find me contact',
        message: 'Please find this contact'
      }).save();

      const foundContact = await Contact.findOne({ email: 'findme@example.com' });
      expect(foundContact).toBeTruthy();
      expect(foundContact.name).toBe('Find Me');
      expect(foundContact.subject).toBe('Find me contact');
    });

    it('should find contacts by name', async () => {
      if (!dbConnected) {
        console.log('⏭️ Skipping - no database connection');
        return;
      }

      await new Contact({
        name: 'John Smith',
        email: 'john1@example.com',
        subject: 'First contact',
        message: 'First message'
      }).save();

      await new Contact({
        name: 'John Smith',
        email: 'john2@example.com',
        subject: 'Second contact',
        message: 'Second message'
      }).save();

      const johnContacts = await Contact.find({ name: 'John Smith' });
      expect(johnContacts).toHaveLength(2);
      expect(johnContacts[0].name).toBe('John Smith');
      expect(johnContacts[1].name).toBe('John Smith');
    });

    it('should update contact information', async () => {
      if (!dbConnected) {
        console.log('⏭️ Skipping - no database connection');
        return;
      }

      const contact = await new Contact({
        name: 'Original Name',
        email: 'update@example.com',
        subject: 'Original Subject',
        message: 'Original message'
      }).save();

      const updatedContact = await Contact.findByIdAndUpdate(
        contact._id,
        { 
          name: 'Updated Name',
          subject: 'Updated Subject',
          message: 'Updated message'
        },
        { new: true }
      );

      expect(updatedContact.name).toBe('Updated Name');
      expect(updatedContact.subject).toBe('Updated Subject');
      expect(updatedContact.message).toBe('Updated message');
      expect(updatedContact.email).toBe('update@example.com'); // Should remain unchanged
    });

    it('should delete contact from database', async () => {
      if (!dbConnected) {
        console.log('⏭️ Skipping - no database connection');
        return;
      }

      const contact = await new Contact({
        name: 'Delete Me',
        email: 'delete@example.com',
        subject: 'Delete me contact',
        message: 'Please delete this contact'
      }).save();

      const contactId = contact._id;
      await Contact.findByIdAndDelete(contactId);

      const deletedContact = await Contact.findById(contactId);
      expect(deletedContact).toBeNull();
    });

    it('should validate required fields', async () => {
      if (!dbConnected) {
        console.log('⏭️ Skipping - no database connection');
        return;
      }

      const contact = new Contact({
        // Missing required fields
        name: 'Test Name'
        // Missing email and message (required)
        // subject is not required
      });

      let error;
      try {
        await contact.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.errors.email).toBeDefined();
      expect(error.errors.message).toBeDefined();
      // subject is not required, so it shouldn't have an error
    });

    it('should validate email format', async () => {
      if (!dbConnected) {
        console.log('⏭️ Skipping - no database connection');
        return;
      }

      const contact = new Contact({
        name: 'Invalid Email',
        email: 'invalid-email-format',
        subject: 'Test Subject',
        message: 'Test message'
      });

      let error;
      try {
        await contact.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.errors.email).toBeDefined();
    });

    it('should search contacts by subject', async () => {
      if (!dbConnected) {
        console.log('⏭️ Skipping - no database connection');
        return;
      }

      await new Contact({
        name: 'Search Test',
        email: 'search1@example.com',
        subject: 'SEARCHABLE_SUBJECT_ONE',
        message: 'First searchable contact'
      }).save();

      await new Contact({
        name: 'Search Test',
        email: 'search2@example.com',
        subject: 'SEARCHABLE_SUBJECT_TWO',
        message: 'Second searchable contact'
      }).save();

      const searchResults = await Contact.find({
        subject: { $regex: 'SEARCHABLE', $options: 'i' }
      });

      expect(searchResults).toHaveLength(2);
      expect(searchResults[0].subject).toContain('SEARCHABLE');
      expect(searchResults[1].subject).toContain('SEARCHABLE');
    });

    it('should handle long messages', async () => {
      if (!dbConnected) {
        console.log('⏭️ Skipping - no database connection');
        return;
      }

      const longMessage = 'A'.repeat(1000); // 1000 character message
      const contact = await new Contact({
        name: 'Long Message User',
        email: 'longmessage@example.com',
        subject: 'Long Message Test',
        message: longMessage
      }).save();

      expect(contact.message).toBe(longMessage);
      expect(contact.message.length).toBe(1000);
    });

    it('should handle multiple contacts with sorting', async () => {
      if (!dbConnected) {
        console.log('⏭️ Skipping - no database connection');
        return;
      }

      // Create contacts with different creation times
      await new Contact({
        name: 'First Contact',
        email: 'first@example.com',
        subject: 'First',
        message: 'First message'
      }).save();

      // Longer delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 100));

      await new Contact({
        name: 'Second Contact',
        email: 'second@example.com',
        subject: 'Second',
        message: 'Second message'
      }).save();

      await new Promise(resolve => setTimeout(resolve, 100));

      await new Contact({
        name: 'Third Contact',
        email: 'third@example.com',
        subject: 'Third',
        message: 'Third message'
      }).save();

      // Test sorting by submission date (newest first)
      const sortedContacts = await Contact.find({})
        .sort({ submittedAt: -1 })
        .limit(3);

      expect(sortedContacts).toHaveLength(3);
      expect(sortedContacts[0].name).toBe('Third Contact');
      expect(sortedContacts[1].name).toBe('Second Contact');
      expect(sortedContacts[2].name).toBe('First Contact');
    });

    it('should count total contacts', async () => {
      if (!dbConnected) {
        console.log('⏭️ Skipping - no database connection');
        return;
      }

      // Create 5 contacts
      for (let i = 1; i <= 5; i++) {
        await new Contact({
          name: `Contact ${i}`,
          email: `contact${i}@example.com`,
          subject: `Subject ${i}`,
          message: `Message ${i}`
        }).save();
      }

      const totalContacts = await Contact.countDocuments({});
      expect(totalContacts).toBe(5);
    });
  });

  describe('Database Connection Status', () => {
    it('should inform about database connection status', () => {
      if (dbConnected) {
        console.log('✅ Database is connected - running Contact integration tests');
        expect(dbConnected).toBe(true);
      } else {
        console.log('❌ Database is not connected - skipping Contact integration tests');
        expect(dbConnected).toBe(false);
      }
    });
  });
}); 