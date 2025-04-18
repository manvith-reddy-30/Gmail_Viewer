// Function to get an OAuth 2.0 access token
async function getAccessToken() {
    return new Promise((resolve, reject) => {
      chrome.identity.getAuthToken({ interactive: true }, function(token) {
        if (chrome.runtime.lastError) {
          console.error(chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
          return;
        }
        resolve(token);
      });
    });
  }
  
  // Function to interact with your LLM agent
  async function processEmailWithLLM(emailBody, emailSubject) {
    // Replace with your LLM API endpoint and logic
    const llmApiUrl = 'YOUR_LLM_API_ENDPOINT';
    const apiKey = 'YOUR_LLM_API_KEY';
  
    try {
      const response = await fetch(llmApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}` // Or however your LLM API authenticates
        },
        body: JSON.stringify({
          text: `<span class="math-inline">\{emailSubject\}\\n</span>{emailBody}`
        })
      });
  
      if (!response.ok) {
        console.error('LLM API Error:', response.status);
        return null;
      }
  
      const llmResult = await response.json();
      // Assuming the LLM returns an object like:
      // { company: "Example Company", deadline: "2025-04-20", time: "17:00" }
      return llmResult;
    } catch (error) {
      console.error('Error communicating with LLM:', error);
      return null;
    }
  }
  
  // Function to create a Google Calendar event (reminder)
  async function createGoogleReminder(company, deadline, time) {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      console.error('Failed to get access token.');
      return;
    }
  
    const dateTimeStr = `<span class="math-inline">\{deadline\}T</span>{time}:00Z`; // Assuming UTC time from LLM
    const event = {
      summary: `Reminder: ${company} Registration`,
      start: {
        dateTime: dateTimeStr,
        timeZone: 'UTC' // Adjust if your LLM provides timezone info
      },
      end: {
        dateTime: dateTimeStr,
        timeZone: 'UTC'
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 30 }, // Reminder 30 minutes before
          { method: 'popup', minutes: 5 }   // Reminder 5 minutes before
        ]
      }
    };
  
    const calendarId = 'primary'; // Use the user's primary calendar
    const apiUrl = `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`;
  
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(event)
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Google Calendar API Error:', response.status, errorData);
      } else {
        const eventData = await response.json();
        console.log('Reminder set:', eventData.htmlLink);
        // Optionally show a notification to the user
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'images/icon48.png',
          title: 'Reminder Set!',
          message: `Reminder for ${company} on ${deadline} at ${time} has been created.`,
        });
      }
    } catch (error) {
      console.error('Error creating Google Calendar event:', error);
    }
  }
  
  // Listen for messages from the content script
  chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
    if (request.action === 'processEmail') {
      const { body, subject } = request;
      console.log('Processing email:', subject);
      const extractedInfo = await processEmailWithLLM(body, subject);
  
      if (extractedInfo && extractedInfo.company && extractedInfo.deadline && extractedInfo.time) {
        await createGoogleReminder(
          extractedInfo.company,
          extractedInfo.deadline,
          extractedInfo.time
        );
      } else {
        console.warn('Could not extract necessary information from the email.');
        // Optionally notify the user about the failure
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'images/icon48.png',
          title: 'Reminder Failed',
          message: 'Could not extract company, deadline, or time from the email.',
        });
      }
    }
  });