const express = require('express');
const OpenAI = require('openai');
const bodyParser = require('body-parser');
require('dotenv').config(); 

const app = express();
const port = 3000;

// Your OpenAI API key
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY, // Replace with your actual OpenAI API key
});

app.use(bodyParser.json());
app.use(express.static('.')); // Serve static files from the current directory

// Endpoint to receive messages from the frontend
app.post('/sendMessage', async (req, res) => {
  const userMessage = req.body.message;

  try {
    // Attempt to create a Thread for a new conversation
    const threadResponse = await openai.beta.threads.create();

    console.log(threadResponse)

    // Check if the thread was created successfully and extract the thread_id
    if (!threadResponse || !threadResponse.id) {
        throw new Error('Thread creation failed or did not return data.');    
    }

    const threadId = threadResponse.id;

    // Add a Message to the Thread using the correct thread ID
    const messageResponse = await openai.beta.threads.messages.create(threadId, {
        role: "user",
        content: userMessage
      }, {
        headers: {
          'OpenAI-Beta': 'assistants=v1'
        }
    });

    console.log(messageResponse)

    // Ensure message was added successfully
    if (!messageResponse || !messageResponse.id) {
        throw new Error('Message creation failed or did not return data.');
    }

    // Run the Assistant on the Thread
    const runResponse = await openai.beta.threads.runs.create(threadId, {
        assistant_id: 'asst_Yxaxadt1mW1DJMs2oMziqwNE' // Use the provided Assistant ID
      }, {
        headers: {
          'OpenAI-Beta': 'assistants=v1'
        }
      });
      console.log(runResponse)
      // Periodically check the status of the run
      let runCompleted = false;
      while (!runCompleted) {
        const runStatus = await openai.beta.threads.runs.retrieve(threadId, runResponse.id, {
          headers: {
            'OpenAI-Beta': 'assistants=v1'
          }
        });
        if (runStatus.status === 'completed') {
          runCompleted = true;
  
          // Retrieve the Messages added by the Assistant to the Thread
          const messagesResponse = await openai.beta.threads.messages.list(threadId, {
            headers: {
              'OpenAI-Beta': 'assistants=v1'
            }
          });

          console.log("message response", messagesResponse)
  
          // Send the response back to the frontend
          // Assuming we want to send back the last assistant message
            const messages = messagesResponse.body.data; // Access the messages from the body.data property
            const lastAssistantMessage = messages.filter(msg => msg.role === 'assistant').pop(); // Filter for assistant messages

            // Make sure we have an assistant message to send back
            if (!lastAssistantMessage) {
                res.status(404).send('No assistant messages found.');
                return;
            }
            console.log("last message", lastAssistantMessage.content[0].text)
            res.json({ message: lastAssistantMessage.content[0].text.value }); // Send the content of the last assistant message

        } else {
          // If not completed, wait a bit before checking again
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    } catch (error) {
        console.error('An error occurred:', error);
        res.status(500).send('An error occurred while processing your request.');
    }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
