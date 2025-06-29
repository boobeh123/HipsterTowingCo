const Contact = require('../../../models/Contact');

describe('Contact Model', () => {
  it('should require email and message', async () => {
    const contact = new Contact({});
    let err;
    try {
      await contact.validate();
    } catch (e) {
      err = e;
    }
    expect(err.errors.email).toBeDefined();
    expect(err.errors.message).toBeDefined();
  });

  it('should require a valid email', async () => {
    const contact = new Contact({ email: 'bademail', message: 'Hello' });
    let err;
    try {
      await contact.validate();
    } catch (e) {
      err = e;
    }
    expect(err.errors.email).toBeDefined();
  });

  it('should not allow name longer than 100 chars', async () => {
    const contact = new Contact({ email: 'test@example.com', message: 'Hello', name: 'a'.repeat(101) });
    let err;
    try {
      await contact.validate();
    } catch (e) {
      err = e;
    }
    expect(err.errors.name).toBeDefined();
  });

  it('should not allow subject longer than 200 chars', async () => {
    const contact = new Contact({ email: 'test@example.com', message: 'Hello', subject: 'a'.repeat(201) });
    let err;
    try {
      await contact.validate();
    } catch (e) {
      err = e;
    }
    expect(err.errors.subject).toBeDefined();
  });

  it('should not allow message longer than 2000 chars', async () => {
    const contact = new Contact({ email: 'test@example.com', message: 'a'.repeat(2001) });
    let err;
    try {
      await contact.validate();
    } catch (e) {
      err = e;
    }
    expect(err.errors.message).toBeDefined();
  });
}); 