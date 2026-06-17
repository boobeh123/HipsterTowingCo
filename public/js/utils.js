/**************************************************************
 * utils.js - client-side javascript functions extracted from main.js (/public/js/main.js)
 * These functions will be tested with jest (/test/unit/clientSideJS.test.js)
 
 * TEST RESULTS
    Test Suites: 1 passed, 1 total
    Tests:       24 passed, 24 total
   sanitizeText()
    √ should remove < and > characters (3 ms)                                                                                                                                                                                                 
    √ should remove double quotes (1 ms)                                                                                                                                                                                                      
    √ should remove backticks (1 ms)                                                                                                                                                                                                          
    √ should remove single quotes (1 ms)                                                                                                                                                                                                      
    √ should remove backslashes (4 ms)                                                                                                                                                                                                        
    √ should trim leading and trailing whitespace (1 ms)                                                                                                                                                                                      
    √ should return an empty string when given a non-string (1 ms)                                                                                                                                                                            
    √ should return an empty string when given an empty string (1 ms)                                                                                                                                                                         
    √ should leave safe characters untouched (1 ms)                                                                                                                                                                                           
    √ should match the documented examples (1 ms)                                                                                                                                                                                             
  validateAndSanitize()                                                                                                                                                                                                                       
    √ should return a sanitized object on valid input (1 ms)                                                                                                                                                                                  
    √ should return null when truckTractorNo is empty                                                                                                                                                                                         
    √ should return null when truckTractorNo is only XSS characters (1 ms)                                                                                                                                                                    
    √ should sanitize XSS characters from truckTractorNo (1 ms)                                                                                                                                                                               
    √ should sanitize XSS characters from trailerNo (1 ms)                                                                                                                                                                                    
    √ should sanitize XSS characters from remarks                                                                                                                                                                                             
    √ should preserve the defects object unchanged                                                                                                                                                                                            
    √ should handle empty optional fields without error (2 ms)                                                                                                                                                                                
    √ should match the documented example (1 ms)                                                                                                                                                                                              
  decodeHTMLEntities()                                                                                                                                                                                                                        
    √ should decode &lt; and &gt; (4 ms)                                                                                                                                                                                                      
    √ should decode &amp; (1 ms)                                                                                                                                                                                                              
    √ should decode &quot; (1 ms)                                                                                                                                                                                                             
    √ should return a plain string unchanged (1 ms)                                                                                                                                                                                           
    √ should decode a full XSS entity string (1 ms)    
 **************************************************************/

/**************************************************************
 * sanitizeText()
 * Strips characters used in XSS attacks from a string.
 * Parameters: string — the value to sanitize
 * Returns: a sanitized string, or '' if input is not a string
 * Examples:
 * '<img src="#" onerror=alert(1)'  -> 'img src=# onerror=alert(1)'
 * "'; DROP TABLE users; --"        -> '; DROP TABLE users; --'
 * '     hello `world`     '        -> 'hello world'
 * 'C:\Program Files\'              -> 'C:Program Files'
 **************************************************************/
function sanitizeText(string) {
    let sanitized = '';
    const arrayOfStrings = ['<', '>', '"', '`', "'", '\\'];

    if (typeof string === 'string') {
        for (let i = 0; i < string.length; i++) {
            if (!arrayOfStrings.includes(string[i])) {
                sanitized += string[i];
            }
        }
    } else {
        return '';
    }
    return sanitized.trim();
}

/**************************************************************
 * validateAndSanitize()
 * Sanitizes all string fields on an inspection object.
 * Returns null if truckTractorNo is missing after sanitization.
 * Parameters: userInspectionObject — raw object from readFormData()
 * Returns: sanitized object, or null if truck number is missing
 **************************************************************/
function validateAndSanitize(userInspectionObject) {
    const truckNo = sanitizeText(userInspectionObject.truckTractorNo);

    if (!truckNo) {
        return null;
    }

    const sanitizedUserInspectionObject = {
        ...userInspectionObject,
        truckTractorNo: truckNo,
        trailerNo: sanitizeText(userInspectionObject.trailerNo),
        remarks: sanitizeText(userInspectionObject.remarks),
        mechanicDate: sanitizeText(userInspectionObject.mechanicDate),
        driverDate: sanitizeText(userInspectionObject.driverDate),
    };

    return sanitizedUserInspectionObject;
}

/**************************************************************
 * decodeHTMLEntities()
 * Decodes HTML entities in a string via a detached textarea.
 * The detached element is never inserted into the live DOM
 * so there is no XSS risk.
 * Note: this function requires a DOM environment (browser or jsdom).
 * Parameters: remarks — a string that may contain HTML entities
 * Returns: decoded string
 **************************************************************/
function decodeHTMLEntities(remarks) {
    const textArea = document.createElement('textarea');
    textArea.innerHTML = remarks;
    return textArea.value;
}

module.exports = { sanitizeText, validateAndSanitize, decodeHTMLEntities };
