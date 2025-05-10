# Ask A Doc

This is a Next.js project that uses Vercel AI and Google Cloud for a RAG (Retrieval Augmented Generation) application. The application allows users to upload PDF documents, which are then parsed and used to answer user questions.

## Features

- **PDF Upload and Parsing:** Users can upload PDF files. The application uses Google Cloud Document AI to extract text and then splits the text into chunks suitable for indexing.
- **Vector Indexing:** Text chunks are indexed in a Google Cloud Vector Store, enabling efficient similarity search.
- **Retrieval Augmented Generation (RAG):** User queries are used to retrieve relevant text chunks from the vector store. These retrieved chunks, along with the user query, are provided as context to a large language model (LLM) (specifically Google's Gemini model) to generate accurate and contextually relevant answers.
- **Frontend:** A user-friendly interface built with Next.js and Tailwind CSS.
- **Backend:** Genkit AI is used to orchestrate the backend flows, handling document processing, vector indexing, and AI model interactions.

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- Google Cloud Project with billing enabled
- Install the gcloud CLI and authenticate:
  
```bash
gcloud auth application-default login
```

### Setup and Deployment

1. **Clone the repository:**

   
```bash
git clone <repository-url>
   cd ask-a-doc
```

2. **Install dependencies:**

   
```bash
npm install
```

3. **Set up Google Cloud Resources:**

   - Enable the following APIs in your Google Cloud project:
     - Document AI API
     - Vertex AI API
   - Create a Vertex AI Vector Search index and endpoint. Refer to the [Vertex AI Vector Search documentation](https://cloud.google.com/vertex-ai/docs/matching-engine/create-index) for detailed instructions.
   - Note the project ID, location, index ID, and endpoint ID for the next step.

4. **Configure Environment Variables:**

   Create a `.env.local` file in the root of the project and add the following variables, replacing the placeholders with your Google Cloud project details:

   
```
env
   # Google Cloud Project Configuration
   PROJECT_ID=your-google-cloud-project-id
   LOCATION=your-google-cloud-location # e.g., us-central1
   VECTOR_STORE_INDEX_ID=your-vector-search-index-id
   VECTOR_STORE_ENDPOINT_ID=your-vector-search-endpoint-id
```

5. **Run Genkit Flows:**

   This project uses Genkit AI to define and run the backend flows.

   - Run the following command to start the Genkit developer UI and run the flows:

     
```bash
genkit start
```

   This will start the Genkit development server and open the developer UI in your browser. You can use the UI to test the `extractTextFromDocumentFlow`, `routeQuery`, and `generateAnswer` flows.

6. **Run the Next.js Development Server:**

   In a separate terminal, run:

   
```bash
npm run dev
```

   Open your browser to `http://localhost:3000` to see the application.

### Deployment to Vercel

This project can be easily deployed to Vercel.

1. **Install the Vercel CLI:**

   
```bash
npm install -g vercel
```

2. **Link your project:**

   
```bash
vercel link
```

3. **Configure environment variables on Vercel:**

   Add the environment variables defined in your `.env.local` file to your Vercel project settings.

4. **Deploy:**

   
```bash
vercel --prod
```

   Vercel will build and deploy your Next.js application.

## Project Structure

- `src/ai/flows`: Contains the Genkit AI flows for document processing and Q&A.
- `src/app`: Contains the Next.js application pages and components.
- `src/components/ui`: Reusable UI components.
- `src/lib/utils.ts`: Utility functions.
- `src/hooks`: Custom React hooks.

## Built With

- Next.js
- React
- Tailwind CSS
- Vercel AI
- Genkit AI
- Google Cloud Platform (Document AI, Vertex AI, Vector Search)

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
