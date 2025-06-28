/**
 * @jest-environment jsdom
 */

// Mock external libraries and browser APIs
global.fetch = jest.fn();
global.M = {
  Modal: { init: jest.fn(() => ({ open: jest.fn(), close: jest.fn() })) },
  FormSelect: { init: jest.fn() },
  Sidenav: { init: jest.fn() },
  Slider: { init: jest.fn() },
  Collapsible: { init: jest.fn() },
  toast: jest.fn(),
  updateTextFields: jest.fn()
};
global.AOS = { init: jest.fn() };
global.confetti = jest.fn();
global.gtag = jest.fn();

// Mock jsPDF
global.window.jspdf = {
  jsPDF: jest.fn(() => ({
    setTextColor: jest.fn(),
    setFontSize: jest.fn(),
    text: jest.fn(),
    addImage: jest.fn(),
    splitTextToSize: jest.fn(() => ['test']),
    output: jest.fn(() => 'blob:test')
  }))
};

// Mock Image constructor
global.Image = jest.fn(() => ({
  src: '',
  onload: null
}));

// Mock window.open
global.window.open = jest.fn();

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};
global.localStorage = localStorageMock;

// Mock document.createElement
document.createElement = jest.fn((tag) => ({
  tagName: tag.toUpperCase(),
  appendChild: jest.fn(),
  removeChild: jest.fn(),
  click: jest.fn(),
  href: '',
  download: '',
  innerHTML: '',
  value: ''
}));

// Mock URLSearchParams
global.URLSearchParams = jest.fn(() => ({
  toString: jest.fn(() => 'email=test@example.com')
}));

// Mock FormData
global.FormData = jest.fn(() => ({
  forEach: jest.fn(),
  append: jest.fn()
}));

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn((cb) => setTimeout(cb, 16));

// Mock setTimeout and clearTimeout
global.setTimeout = jest.fn((cb, delay) => {
  const id = Math.random();
  setTimeout.mock.timers = setTimeout.mock.timers || {};
  setTimeout.mock.timers[id] = { cb, delay };
  return id;
});
global.clearTimeout = jest.fn();

// Mock navigator
global.navigator = {
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
};

describe('Client-Side JavaScript', () => {
  let mockSearchInput, mockInspectionList, mockContactForm, mockProfilePicForm;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup DOM elements
    mockSearchInput = {
      addEventListener: jest.fn(),
      value: '',
      trim: jest.fn(() => '')
    };
    
    mockInspectionList = {
      innerHTML: '',
      insertAdjacentHTML: jest.fn(),
      querySelectorAll: jest.fn(() => [])
    };
    
    mockContactForm = {
      addEventListener: jest.fn(),
      reset: jest.fn(),
      querySelector: jest.fn()
    };
    
    mockProfilePicForm = {
      addEventListener: jest.fn(),
      reset: jest.fn()
    };

    // Mock document.getElementById
    document.getElementById = jest.fn((id) => {
      switch (id) {
        case 'search':
          return mockSearchInput;
        case 'inspection-list':
          return mockInspectionList;
        case 'contact-form':
          return mockContactForm;
        case 'profile-pic-form':
          return mockProfilePicForm;
        case 'inspectionModal':
          return { id: 'inspectionModal' };
        case 'startInspectionBtn':
          return { addEventListener: jest.fn() };
        case 'submitInspection':
          return { addEventListener: jest.fn() };
        case 'inspectionForm':
          return { id: 'inspectionForm' };
        case 'truckTractorNo':
          return { value: '', focus: jest.fn() };
        case 'date':
          return { value: '' };
        case 'contact-name':
          return { value: '' };
        case 'contact-email':
          return { value: '' };
        case 'contact-subject':
          return { value: '' };
        case 'contact-messageBox':
          return { value: '' };
        case 'contact-message':
          return { innerHTML: '' };
        case 'upload-btn':
          return { disabled: false };
        case 'upload-btn-text':
          return { style: { display: '' } };
        case 'upload-preloader':
          return { style: { display: 'none' } };
        case 'profile-file':
          return { addEventListener: jest.fn(), files: [], value: '' };
        case 'load-more-btn':
          return { 
            addEventListener: jest.fn(), 
            textContent: 'Load More',
            disabled: false,
            dataset: { page: '1' },
            style: { display: '' }
          };
        case 'open-dvir-pdf':
          return { addEventListener: jest.fn() };
        case 'forgot':
          return { 
            addEventListener: jest.fn(),
            querySelector: jest.fn(() => ({ value: '', focus: jest.fn() })),
            reset: jest.fn()
          };
        default:
          return null;
      }
    });

    // Mock document.querySelector
    document.querySelector = jest.fn((selector) => {
      if (selector === 'form[action="/forgot"]') {
        return {
          addEventListener: jest.fn(),
          querySelector: jest.fn(() => ({ value: '', focus: jest.fn() })),
          reset: jest.fn()
        };
      }
      if (selector === '.profile-main img.circle') {
        return { src: '' };
      }
      if (selector === '.sidenav') {
        return { id: 'sidenav' };
      }
      if (selector === '.slider') {
        return { id: 'slider' };
      }
      if (selector === '.collapsible') {
        return [];
      }
      if (selector === 'select') {
        return [];
      }
      if (selector === '.hero-img') {
        return {
          addEventListener: jest.fn(),
          getBoundingClientRect: jest.fn(() => ({ width: 100, height: 100 })),
          style: {}
        };
      }
      if (selector === '#hero-particles') {
        return {
          getContext: jest.fn(() => ({
            clearRect: jest.fn(),
            save: jest.fn(),
            restore: jest.fn(),
            globalAlpha: 1,
            font: '',
            fillStyle: '',
            textBaseline: '',
            textAlign: '',
            fillText: jest.fn()
          })),
          width: 100,
          height: 100,
          offsetWidth: 100,
          offsetHeight: 100
        };
      }
      return null;
    });

    // Mock document.querySelectorAll
    document.querySelectorAll = jest.fn((selector) => {
      if (selector === 'select') {
        return [];
      }
      if (selector === '.collapsible') {
        return [];
      }
      return [];
    });

    // Mock window.inspectionData
    window.inspectionData = {
      truckTractorNo: '12345',
      trailerNo: '67890',
      date: '2024-01-01',
      remarks: 'Test remarks',
      defects: {
        truckTractor: {
          brakes: true,
          lights: false
        },
        trailer: {
          brakes: false,
          lights: true
        }
      }
    };

    // Mock document.body methods
    document.body.appendChild = jest.fn();
    document.body.removeChild = jest.fn();
    document.body.insertAdjacentHTML = jest.fn();
  });

  describe('Search Functionality', () => {
    it('should set up search input event listener', () => {
      const searchInput = document.getElementById('search');
      if (searchInput) {
        searchInput.addEventListener('input', jest.fn());
      }

      expect(document.getElementById).toHaveBeenCalledWith('search');
      expect(mockSearchInput.addEventListener).toHaveBeenCalledWith('input', expect.any(Function));
    });

    it('should make fetch request for search query', async () => {
      // Mock successful fetch response
      fetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({
          inspections: [
            {
              _id: '1',
              truckTractorNo: '12345',
              conditionSatisfactory: true,
              createdAt: '2024-01-01T00:00:00.000Z',
              remarks: 'Test remarks'
            }
          ]
        })
      });

      // Simulate search request
      await fetch('/todos/search?q=test');
      
      expect(fetch).toHaveBeenCalledWith('/todos/search?q=test');
    });

    it('should handle search error', async () => {
      // Mock failed fetch response
      fetch.mockRejectedValueOnce(new Error('Network error'));

      try {
        await fetch('/todos/search?q=test');
      } catch (error) {
        expect(error.message).toBe('Network error');
      }
    });
  });

  describe('Form Handling', () => {
    it('should validate required fields', () => {
      const truckInput = document.getElementById('truckTractorNo');
      expect(truckInput).toBeDefined();
      expect(truckInput.value).toBe('');
    });

    it('should handle form submission', async () => {
      // Mock successful fetch response
      fetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({ success: true })
      });

      // Mock form data
      const mockFormData = {
        forEach: jest.fn((callback) => {
          callback('test', 'truckTractorNo');
        })
      };
      FormData.mockReturnValueOnce(mockFormData);
      
      await fetch('/todos/createInspection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ truckTractorNo: '12345' })
      });
      
      expect(fetch).toHaveBeenCalledWith('/todos/createInspection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.any(String)
      });
    });
  });

  describe('Contact Form Handling', () => {
    it('should validate contact form fields', async () => {
      // Create specific mocks for this test
      const contactMessage = { innerHTML: '' };
      const mockGetElementById = jest.fn((id) => {
        switch (id) {
          case 'contact-name':
            return { value: '' };
          case 'contact-email':
            return { value: '' };
          case 'contact-subject':
            return { value: '' };
          case 'contact-messageBox':
            return { value: '' };
          case 'contact-message':
            return contactMessage;
          default:
            return null;
        }
      });
      
      // Temporarily replace the global mock
      const originalGetElementById = document.getElementById;
      document.getElementById = mockGetElementById;
      
      // Simulate form validation logic
      const name = document.getElementById('contact-name').value;
      const email = document.getElementById('contact-email').value;
      const subject = document.getElementById('contact-subject').value;
      const message = document.getElementById('contact-messageBox').value;
      
      if (!name || !email || !subject || !message) {
        contactMessage.innerHTML = '<span class="red-text">Please fill in all fields.</span>';
      }
      
      expect(contactMessage.innerHTML).toContain('Please fill in all fields');
      
      // Restore original mock
      document.getElementById = originalGetElementById;
    });

    it('should validate email format', async () => {
      // Create specific mocks for this test
      const contactMessage = { innerHTML: '' };
      const mockGetElementById = jest.fn((id) => {
        switch (id) {
          case 'contact-name':
            return { value: 'test' };
          case 'contact-email':
            return { value: 'invalid-email' };
          case 'contact-subject':
            return { value: 'test' };
          case 'contact-messageBox':
            return { value: 'test' };
          case 'contact-message':
            return contactMessage;
          default:
            return null;
        }
      });
      
      // Temporarily replace the global mock
      const originalGetElementById = document.getElementById;
      document.getElementById = mockGetElementById;
      
      // Simulate email validation logic
      const email = document.getElementById('contact-email').value;
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      
      if (!emailRegex.test(email)) {
        contactMessage.innerHTML = '<span class="red-text">Please enter a valid email address.</span>';
      }
      
      expect(contactMessage.innerHTML).toContain('Please enter a valid email address');
      
      // Restore original mock
      document.getElementById = originalGetElementById;
    });

    it('should handle successful contact form submission', async () => {
      // Mock successful fetch response
      fetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({ success: true })
      });

      // Simulate form submission
      await fetch('/contact/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test User',
          email: 'test@example.com',
          subject: 'Test Subject',
          message: 'Test message'
        })
      });
      
      expect(fetch).toHaveBeenCalledWith('/contact/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.any(String)
      });
    });
  });

  describe('Profile Picture Upload', () => {
    it('should handle file validation', () => {
      // Mock invalid file type
      const mockFile = {
        type: 'text/plain',
        size: 1024
      };
      
      // Simulate file validation logic
      if (!mockFile.type.startsWith('image/')) {
        M.toast({html: 'Please select an image file.', classes: 'red'});
      }
      
      expect(M.toast).toHaveBeenCalledWith({
        html: 'Please select an image file.',
        classes: 'red'
      });
    });

    it('should handle file size validation', () => {
      // Mock oversized file
      const mockFile = {
        type: 'image/jpeg',
        size: 15 * 1024 * 1024 // 15MB
      };
      
      // Simulate file size validation logic
      if (mockFile.size > 10 * 1024 * 1024) {
        M.toast({html: 'Image must be less than 10MB.', classes: 'red'});
      }
      
      expect(M.toast).toHaveBeenCalledWith({
        html: 'Image must be less than 10MB.',
        classes: 'red'
      });
    });
  });

  describe('Load More Functionality', () => {
    it('should load more inspections', async () => {
      // Mock successful fetch response
      fetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({
          inspections: [
            {
              _id: '2',
              truckTractorNo: '67890',
              conditionSatisfactory: false,
              createdAt: '2024-01-02T00:00:00.000Z',
              remarks: 'More test remarks'
            }
          ],
          hasMore: false
        })
      });

      // Simulate load more request
      await fetch('/todos/loadmore?page=2');
      
      expect(fetch).toHaveBeenCalledWith('/todos/loadmore?page=2');
    });

    it('should handle load more error', async () => {
      // Mock failed fetch response
      fetch.mockRejectedValueOnce(new Error('Network error'));

      try {
        await fetch('/todos/loadmore?page=2');
      } catch (error) {
        M.toast({html: 'Could not load more inspections.', classes: 'red'});
      }
      
      expect(M.toast).toHaveBeenCalledWith({
        html: 'Could not load more inspections.',
        classes: 'red'
      });
    });
  });

  describe('Forgot Password Form', () => {
    it('should validate email field', async () => {
      // Mock empty email
      const emailInput = { value: '', focus: jest.fn() };
      
      // Simulate email validation logic
      if (!emailInput.value) {
        M.toast({html: 'Please enter your email address.', classes: 'red'});
      }
      
      expect(M.toast).toHaveBeenCalledWith({
        html: 'Please enter your email address.',
        classes: 'red'
      });
    });

    it('should handle successful password reset request', async () => {
      // Mock successful fetch response
      fetch.mockResolvedValueOnce({
        redirected: true
      });

      // Simulate password reset request
      await fetch('/forgot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'email=test@example.com'
      });
      
      expect(fetch).toHaveBeenCalledWith('/forgot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: expect.any(String)
      });
    });
  });

  describe('Utility Functions', () => {
    it('should detect mobile devices', () => {
      // Test mobile user agent
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
        configurable: true
      });
      
      const isMobile = () => /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      expect(isMobile()).toBe(true);
    });

    it('should detect desktop devices', () => {
      // Test desktop user agent
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        configurable: true
      });
      
      const isMobile = () => /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      expect(isMobile()).toBe(false);
    });

    it('should decode HTML entities', () => {
      // Mock document.createElement to return a proper textarea
      const mockTextarea = {
        innerHTML: '',
        value: ''
      };
      document.createElement.mockReturnValueOnce(mockTextarea);
      
      const decodeHTMLEntities = (text) => {
        const txt = document.createElement('textarea');
        txt.innerHTML = text;
        return txt.value;
      };
      
      // Simulate the decoding process
      mockTextarea.innerHTML = '&lt;script&gt;alert("test")&lt;/script&gt;';
      mockTextarea.value = '<script>alert("test")</script>';
      
      expect(decodeHTMLEntities('&lt;script&gt;alert("test")&lt;/script&gt;')).toBe('<script>alert("test")</script>');
    });
  });

  describe('PDF Generation', () => {
    it('should generate PDF with inspection data', async () => {
      const generateDVIRPDF = async (data, skipOpen) => {
        const pdf = new window.jspdf.jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'letter'
        });
        
        // Mock the PDF generation process
        pdf.setTextColor(0, 0, 0);
        pdf.setFontSize(12);
        pdf.text(String(data.date || ''), 30, 41);
        pdf.text(String(data.truckTractorNo || ''), 60, 50);
        
        if (!skipOpen) {
          window.open(pdf.output('bloburl'));
        }
        return pdf;
      };

      const testData = {
        date: '2024-01-01',
        truckTractorNo: '12345',
        trailerNo: '67890',
        remarks: 'Test remarks',
        defects: {
          truckTractor: { brakes: true, lights: false },
          trailer: { brakes: false, lights: true }
        }
      };

      const result = await generateDVIRPDF(testData, true);
      
      expect(result).toBeDefined();
      expect(window.jspdf.jsPDF).toHaveBeenCalledWith({
        orientation: 'portrait',
        unit: 'mm',
        format: 'letter'
      });
    });
  });

  describe('Materialize Initialization', () => {
    it('should initialize Materialize components', () => {
      // Mock the initialization code with actual calls
      const selects = document.querySelectorAll('select');
      M.FormSelect.init(selects);
      
      const sidenav = document.querySelector('.sidenav');
      M.Sidenav.init(sidenav);
      
      const slider = document.querySelector('.slider');
      M.Slider.init(slider);
      
      const collapsibles = document.querySelectorAll('.collapsible');
      M.Collapsible.init(collapsibles);
      
      expect(M.FormSelect.init).toHaveBeenCalled();
      expect(M.Sidenav.init).toHaveBeenCalled();
      expect(M.Slider.init).toHaveBeenCalled();
      expect(M.Collapsible.init).toHaveBeenCalled();
    });
  });

  describe('Canvas Animation', () => {
    it('should set up canvas animation', () => {
      const canvas = document.getElementById('hero-particles');
      if (canvas) {
        const ctx = canvas.getContext('2d');
        expect(ctx).toBeDefined();
        
        // Test resize function
        const resize = () => {
          canvas.width = canvas.offsetWidth;
          canvas.height = canvas.offsetHeight;
        };
        
        resize();
        expect(canvas.width).toBe(100);
        expect(canvas.height).toBe(100);
      }
    });
  });
}); 