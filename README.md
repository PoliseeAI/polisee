# Polisee - Personalized Legislative Impact Analyzer

Build a personalized legislative impact analyzer that transforms complex bills into personalized impact reports. **Admins upload and manage bills**, while users create personas and view AI-generated analysis results. Users can then provide sentiment feedback on specific bill sections that affect them.

## 🚀 Latest Updates

### ✅ Phase 8: PDF Viewer & Source Integration (100% COMPLETED)

**Fully completed comprehensive PDF viewing and source integration functionality:**

#### 🔧 **What's New:**
- **Full PDF Viewer Component** - Complete with zoom, navigation, rotation, and search
- **Text Highlighting System** - Coordinate-based highlighting with customizable colors
- **Source Citation Components** - Professional citation display with context windows
- **PDF Storage Service** - Supabase Storage integration for bill PDFs
- **"View in Context" Functionality** - Click any source citation to jump to PDF location
- **Integrated Analysis Pages** - PDF viewer fully integrated into bill analysis workflow

#### 📱 **Features Implemented:**
- ✅ React PDF viewer with full controls (zoom, rotate, navigate)
- ✅ Text highlighting with click-to-jump functionality
- ✅ Source citation cards with context preview
- ✅ PDF storage and retrieval system
- ✅ Mobile-responsive PDF viewing with optimized layouts
- ✅ Advanced search within PDF documents with result highlighting
- ✅ Section navigation and bookmarking with hierarchical structure
- ✅ Full integration with existing bill analysis pages
- ✅ Mobile-optimized controls and responsive design
- ✅ Real-time search with context preview and navigation

#### 🎯 **How It Works:**
1. **Impact Cards** now show source citations with exact bill text references
2. **"View in Context" buttons** open PDF viewer with highlighted relevant sections
3. **Full PDF viewer** available from bill details and analysis pages with complete navigation
4. **Highlighted text** shows exactly where analysis claims come from
5. **Professional citations** with before/after context for verification
6. **Advanced search** extracts text from PDF and highlights matches with context
7. **Section navigation** provides hierarchical bill structure for easy jumping
8. **Mobile optimization** ensures smooth viewing on all device sizes

#### 📋 **To Complete Setup:**
```bash
# Add a sample PDF for testing
# Place a sample bill PDF at: public/sample-bill.pdf
curl -o public/sample-bill.pdf [URL_TO_SAMPLE_BILL_PDF]
```

**Note:** The system currently uses mock source references and PDF URLs. In production, these would come from:
- Real bill PDFs stored in Supabase Storage
- RAG database with actual bill chunks and embeddings
- AI-generated source references with accurate coordinates

#### 🔄 **Next Steps for Production:**
- Add real bill PDFs to Supabase Storage
- Connect to actual RAG service for source generation
- Integrate with live bill processing pipeline
- Add PDF annotation and note-taking features
- Implement advanced OCR for scanned documents

## 🎯 Project Overview

A Next.js web application that transforms complex legislative bills into personalized, verifiable impact reports for citizens.

### Key Features
- **Multi-step persona creation** with comprehensive demographic profiling
- **AI-powered personalized analysis** tailored to user circumstances
- **PDF bill viewing** with source highlighting and citations
- **Sentiment feedback system** for user engagement tracking
- **Professional UI/UX** with mobile-responsive design
- **Supabase backend** with authentication and real-time features

## 🛠 Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, Shadcn UI
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **PDF Handling**: react-pdf, PDF.js
- **Authentication**: Supabase Auth
- **Database**: PostgreSQL with Row Level Security
- **Deployment**: Vercel (frontend), Supabase (backend)

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- Supabase account and project

### Installation

1. **Clone the repository**
   ```bash
   git clone [repository-url]
   cd polisee
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Add your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   CONGRESS_API_KEY=your-congress-api-key
   ```

4. **Set up database**
   ```bash
   # Run the migration SQL in your Supabase dashboard
   npm run db:migrate
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Access the application**
   Open [http://localhost:3000](http://localhost:3000)

## 📖 User Flow

1. **Create Persona** → Users fill out detailed demographic information
2. **Browse Bills** → View available bills with search and filtering
3. **Get Analysis** → AI generates personalized impact analysis
4. **View Sources** → Click citations to see exact bill text in PDF viewer
5. **Provide Feedback** → Share sentiment on specific bill impacts

## 🔧 Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run db:test      # Test database connection
npm run db:migrate   # Run database migrations
```

### Congress Scraper

```bash
npm run scraper:initial  # Download initial bill data
npm run scraper:daily    # Daily bill updates
npm run scraper:search   # Search for specific bills
```

## 📊 Project Status

- ✅ **Phase 1-7**: Core functionality complete (persona system, bills, analysis, feedback)
- ✅ **Phase 8**: PDF viewer and source integration complete
- 🔄 **Phase 9-15**: Advanced features (export, analytics, testing, deployment)

**Current Status**: ~80% complete with full core user flow functional including advanced PDF viewing

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Congress.gov API for legislative data
- Supabase for backend infrastructure
- Vercel for hosting and deployment
- The open-source community for amazing tools and libraries
