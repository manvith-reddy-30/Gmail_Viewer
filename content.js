function injectReminderButton() {
    const emailItems = document.querySelectorAll('.email-item-selector'); // Replace with the actual CSS selector for email list items
  
    emailItems.forEach(item => {
      if (!item.querySelector('.reminder-button')) {
        const button = document.createElement('button');
        button.textContent = 'Set Reminder';
        button.classList.add('reminder-button'); // For easy identification
  
        button.addEventListener('click', async () => {
          const emailBody = getEmailContent(item); // Implement this function
          const subject = getEmailSubject(item); // Implement this function
  
          // Send the email content to the background script
          chrome.runtime.sendMessage({ action: 'processEmail', body: emailBody, subject: subject });
        });
  
        const buttonContainer = getButtonContainer(item); // Implement this function to find where to insert the button
        if (buttonContainer) {
          buttonContainer.prepend(button); // Or append, depending on desired placement
        }
      }
    });
  }
  
  function getEmailContent(emailItem) {
    // Implement logic to extract the full email body from the DOM structure
    // This will vary significantly depending on the email client.
    // You might need to traverse the DOM to find the relevant elements.
    console.log("Getting email content...");
    return "Example Company Registration Deadline: 2025-04-20 17:00 UTC"; // Placeholder
  }
  
  function getEmailSubject(emailItem) {
    // Implement logic to extract the email subject
    console.log("Getting email subject...");
    return "Registration Deadline Reminder"; // Placeholder
  }
  
  function getButtonContainer(emailItem) {
    // Implement logic to find the appropriate container element within the email item
    // where you want to insert the button. This will vary by email client.
    return emailItem; // Example: insert at the beginning of the email item
  }
  
  // Run the injection when the page loads and potentially on updates (e.g., new emails loaded)
  window.addEventListener('load', injectReminderButton);
  
  // You might need to observe DOM changes for dynamic email loading in some clients
  // Example using MutationObserver:
  const observer = new MutationObserver(injectReminderButton);
  observer.observe(document.body, { childList: true, subtree: true });