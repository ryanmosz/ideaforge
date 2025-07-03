# IdeaForge 🚀

**Transform your project ideas into actionable plans before writing a single line of code.**

IdeaForge is a command-line tool that helps developers and project managers thoroughly plan projects using the MoSCoW prioritization framework combined with Kano model insights. By investing 15-30 minutes in structured planning, you can save weeks of development time and avoid costly pivots.

## 🎯 Quick Demo (5 minutes)

Want to see IdeaForge in action? Follow these steps:

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/ideaforge.git
cd ideaforge

# 2. Install dependencies
npm install

# 3. Run interactive setup
npm run setup

# 4. Run the demo!
npm run test:grammarly
```

The demo analyzes an AI-powered writing assistant for marketing professionals, showcasing:
- **MoSCoW prioritization** of features like tone transformation
- **AI recommendations** for implementation
- **Risk analysis** and technical suggestions

📝 **Note**: You'll need an OpenAI API key. Get one at [platform.openai.com](https://platform.openai.com)

### Try It Yourself!

After running the demo, experiment with your own ideas:

1. **Edit the example**: Modify `example-grammarly-clone.org` with your own features
2. **Run analysis**: `ideaforge analyze example-grammarly-clone.org`
3. **See the magic**: Watch as AI analyzes and prioritizes your ideas

## 📦 Demo for Contributors

If you're reviewing this project, here's the fastest way to see it in action:

```bash
# 1. Clone and setup (2 minutes)
git clone [repository-url]
cd ideaforge
npm install
npm run setup  # Interactive setup - just add your OpenAI key

# 2. Run the marketing-focused demo
npm run test:grammarly

# 3. Explore the example
cat example-grammarly-clone.org  # See the input
cat grammarly-analysis.org       # See the AI output
```

The demo showcases an AI writing assistant for marketers with:
- **Innovative features**: Tone transformation & persuasion enhancement
- **Smart prioritization**: MoSCoW analysis of requirements
- **Technical insights**: Implementation recommendations

💡 **Try modifying** `example-grammarly-clone.org` with your own ideas and re-run!

## 🎯 Why IdeaForge?

### The Problem
- **70% of software projects fail** due to poor planning and scope creep
- Developers often start coding before fully understanding requirements
- Ideas get lost between brainstorming and implementation
- Features are built that users don't actually need

### The Solution
IdeaForge ensures you:
- ✅ **Build the right features first** using proven MoSCoW analysis
- ✅ **Avoid scope creep** with clear "Won't have" boundaries
- ✅ **Get AI-powered suggestions** for features you might have missed
- ✅ **Iterate quickly** through file-based refinement loops
- ✅ **Export actionable plans** directly to your development workflow

## 🌟 Key Features

### 1. **Full MoSCoW Analysis with AI Evaluation**
- **Must Have**: Critical features evaluated with three key questions
- **Should Have**: Important features with value/effort analysis
- **Could Have**: Nice-to-haves prioritized by user impact
- **Won't Have**: Clear boundaries to prevent scope creep

### 2. **Iterative Refinement Loop**
```
Initial Ideas → AI Analysis → Your Feedback → Refined Plan → Final Export
```
Edit the output, add `:RESPONSE:` tags, and re-process for better results.

### 3. **External Intelligence Gathering** ⭐ NEW
Automatically searches and analyzes relevant discussions from:
- **Hacker News**: Technical insights and best practices from the developer community
- **Reddit**: Real-world experiences and project feedback from programming subreddits
- Enriches your project analysis with community wisdom and current trends

### 4. **Smart Export Options**
- **Org-mode**: Full analysis with tables, changelog, and tags
- **Markdown**: Cursor-compatible task lists ready for development

## 🚀 Quick Start

### Installation
```bash
# Clone the repository
git clone https://github.com/yourusername/ideaforge.git
cd ideaforge

# Install dependencies
npm install

# Build the project
npm run build

# Link globally (optional)
npm link
```

### Configuration
```bash
# Copy environment template
cp env.example .env

# Add your API keys
OPENAI_API_KEY=your_openai_key

# For external research features (optional)
# See docs/n8n-setup.md for detailed setup
N8N_BASE_URL=http://localhost:5678
N8N_API_KEY=local-dev-api-key-12345
```

### Basic Usage

1. **Initialize a new project template:**
```bash
ideaforge init
# Creates ideaforge-template.org in current directory
```

2. **Fill out the template** with your:
   - User stories
   - Requirements (pre-tagged with MUST/SHOULD/COULD/WONT)
   - Technology choices
   - Brainstormed ideas

3. **Analyze your project:**
```bash
# Basic analysis
ideaforge analyze my-project.org --output analysis-v1.org

# With external research (recommended!) ⭐
ideaforge analyze my-project.org --output analysis-v1.org --research
```

4. **Refine the analysis:**
```bash
# Edit analysis-v1.org, add :RESPONSE: tags with feedback
ideaforge refine analysis-v1.org --output analysis-v2.org
```

5. **Export final plan:**
```bash
ideaforge export analysis-final.org --format cursor --output tasks.md
```

## 📋 Example Workflow

### Input (Org-mode Template)
```org
* User Stories
** As a developer
   I want to quickly validate my project ideas
   So that I don't waste time building the wrong features

* Requirements
*** MUST User authentication                                          :MUST:
    Secure login system for user data protection
    
*** SHOULD Real-time notifications                                  :SHOULD:
    Keep users engaged with instant updates

* Technology Choices
** Backend/Hosting
*** Option 1: Firebase
*** Option 2: Supabase

* Brainstorming
** Core Features
   - Social login integration
   - Dashboard with analytics
   - Email notifications
   - Mobile app support
```

### Output (After Analysis)
```org
* MoSCoW Analysis Results

** MUST HAVE (2 items)
*** User authentication [Score: 95/100]
    AI Rationale: Critical for data security and user management
    - Impact if excluded: System completely unusable (100/100)
    - Simpler alternative: No, authentication is fundamental
    - Works without: No, core functionality depends on user identity

** SHOULD HAVE (1 item)
*** Dashboard with analytics [Score: 75/100]
    AI Rationale: High value for user engagement, can launch without

** AI SUGGESTIONS
*** Consider implementing:
    1. Password reset flow (commonly forgotten requirement)
    2. Rate limiting for API security
    3. User profile management

*** Architecture Recommendation:
    Based on your requirements, Supabase offers better real-time
    capabilities than Firebase for notification features.

* External Intelligence ⭐
** Technology Insights from Research:
*** React + TypeScript (1,247 discussions analyzed)
    - Strong community preference for Vite over CRA in 2024
    - Consider using Zustand for state management (lighter than Redux)
    - Recent HN thread: "Why we migrated from Redux to Zustand" (342 points)
    
*** Authentication Patterns:
    - Supabase Auth praised for simplicity in recent Reddit threads
    - Common pitfall: Not implementing refresh token rotation
    - Community tip: Use Row Level Security (RLS) from day one

*** Performance Considerations:
    - Bundle splitting crucial for dashboard components
    - React.lazy() with Suspense recommended for analytics views
    - Real user experience: "Cut our load time by 60% with proper splitting"

** Risk Alerts:
   - Firebase costs can escalate quickly with real-time features
   - Consider self-hosted Supabase for better cost control at scale

* Changelog
** v1: Initial analysis - Added AI suggestions for security features
```

## 🛠️ Technical Architecture

- **CLI Framework**: Node.js with TypeScript
- **AI Processing**: OpenAI GPT-4 via LangGraph agents
- **Workflow Engine**: n8n for external API integrations
- **Export Formats**: Org-mode and Markdown
- **External APIs**: Hacker News, Reddit (via n8n)

### n8n Integration (Optional)
IdeaForge can use n8n webhooks for:
- External API calls with rate limiting
- Reddit and Hacker News research
- Cached responses for better performance

See [n8n Setup Guide](docs/n8n-setup.md) for configuration.

## 📊 Benefits for Project Planning

### Time Savings
- **15 minutes of planning** = Avoid 15 hours of rework
- **Clear priorities** = No time wasted on "nice-to-haves"
- **AI suggestions** = Catch missing requirements early

### Better Outcomes
- **Validated ideas** before development starts
- **Stakeholder alignment** with clear MoSCoW categories
- **Risk mitigation** through dependency analysis
- **Smart architecture choices** based on real requirements

### Developer Happiness
- **No more pivots** mid-development
- **Clear task lists** exported to your tools
- **Confidence** in what you're building
- **Documentation** built into the process

## 🔧 Advanced Features

### Custom Evaluation Questions
Modify the MoSCoW evaluation criteria in your n8n workflow

### Technology Stack Validation
AI checks if your chosen technologies work well together

### Risk Assessment
Identifies potential technical and scope risks early

### Dependency Analysis
Understands which features depend on others

## 🧪 For Testers

Setting up IdeaForge for testing? See our comprehensive **[Tester Setup Guide](TESTER-SETUP-GUIDE.md)** which includes:
- Step-by-step Mac setup instructions
- Docker configuration for research features  
- Pre-configured n8n settings
- Common troubleshooting solutions

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## 📝 License

MIT License - see [LICENSE](LICENSE) for details.

## 🙏 Acknowledgments

- Built with the MoSCoW method by Dai Clegg
- Inspired by the Kano model for customer satisfaction
- Powered by OpenAI's GPT-4 for intelligent analysis

---

**Stop guessing. Start building with confidence.** 🎯

Ready to transform your project planning? [Get started now!](#-quick-start)