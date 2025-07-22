-- Initial RSS Sources Data
-- High-quality, curated RSS feeds across major topics

-- AI & Technology Sources
INSERT OR IGNORE INTO rss_sources (url, title, description, topic, subtopic, quality_score, language) VALUES
('https://spectrum.ieee.org/rss/artificial-intelligence', 'IEEE Spectrum AI', 'Latest AI research and applications from IEEE', 'ai', 'research', 0.95, 'en'),
('https://www.technologyreview.com/feed/', 'MIT Technology Review', 'Cutting-edge technology and AI news', 'ai', 'research', 0.90, 'en'),
('https://venturebeat.com/ai/feed/', 'VentureBeat AI', 'AI business and startup news', 'ai', 'business', 0.85, 'en'),
('https://www.artificialintelligence-news.com/feed/', 'AI News', 'Artificial intelligence industry coverage', 'ai', 'industry', 0.80, 'en'),
('https://feeds.feedburner.com/oreilly/radar', 'O''Reilly Radar', 'Technology insights and trends', 'technology', 'trends', 0.82, 'en'),
('https://techcrunch.com/feed/', 'TechCrunch', 'Technology startup and business news', 'technology', 'startup', 0.78, 'en'),
('https://www.theverge.com/rss/index.xml', 'The Verge', 'Technology, science, art, and culture', 'technology', 'culture', 0.80, 'en'),
('https://arstechnica.com/feed/', 'Ars Technica', 'In-depth technology news and analysis', 'technology', 'analysis', 0.85, 'en'),
('https://www.wired.com/feed', 'WIRED', 'Technology, science, culture, and business', 'technology', 'culture', 0.83, 'en');

-- Climate & Environment Sources
INSERT OR IGNORE INTO rss_sources (url, title, description, topic, subtopic, quality_score, language) VALUES
('https://grist.org/feed/', 'Grist', 'Environmental journalism on climate change', 'climate', 'environment', 0.90, 'en'),
('https://www.climatechangenews.com/feed/', 'Climate Change News', 'Global climate policy and science coverage', 'climate', 'policy', 0.88, 'en'),
('https://insideclimatenews.org/feed/', 'Inside Climate News', 'Climate science and policy reporting', 'climate', 'science', 0.92, 'en'),
('https://www.carbonbrief.org/feed', 'Carbon Brief', 'Climate science, policy and energy analysis', 'climate', 'analysis', 0.89, 'en');

-- Science Sources
INSERT OR IGNORE INTO rss_sources (url, title, description, topic, subtopic, quality_score, language) VALUES
('https://www.nature.com/nature.rss', 'Nature', 'Leading international weekly journal of science', 'science', 'research', 0.98, 'en'),
('https://www.sciencemag.org/rss/current.xml', 'Science Magazine', 'Cutting-edge research and discoveries', 'science', 'research', 0.95, 'en'),
('https://feeds.feedburner.com/sciencedaily', 'ScienceDaily', 'Latest research news across all sciences', 'science', 'news', 0.85, 'en'),
('https://www.newscientist.com/feed/home/', 'New Scientist', 'Science news, research and discoveries', 'science', 'news', 0.82, 'en');

-- Crypto & Blockchain Sources  
INSERT OR IGNORE INTO rss_sources (url, title, description, topic, subtopic, quality_score, language) VALUES
('https://cointelegraph.com/rss', 'Cointelegraph', 'Cryptocurrency and blockchain news', 'crypto', 'news', 0.80, 'en'),
('https://bitcoinmagazine.com/.rss/full/', 'Bitcoin Magazine', 'Bitcoin and cryptocurrency coverage', 'crypto', 'bitcoin', 0.85, 'en'),
('https://decrypt.co/feed', 'Decrypt', 'Crypto and Web3 news and analysis', 'crypto', 'web3', 0.78, 'en');

-- Business & Finance Sources
INSERT OR IGNORE INTO rss_sources (url, title, description, topic, subtopic, quality_score, language) VALUES
('https://feeds.bloomberg.com/markets/news.rss', 'Bloomberg Markets', 'Financial markets and business news', 'business', 'markets', 0.92, 'en'),
('https://www.reuters.com/business/feed', 'Reuters Business', 'Global business and financial news', 'business', 'finance', 0.90, 'en'),
('https://feeds.fortune.com/fortune/headlines', 'Fortune', 'Business leadership and market insights', 'business', 'leadership', 0.85, 'en');

-- Health & Medical Sources
INSERT OR IGNORE INTO rss_sources (url, title, description, topic, subtopic, quality_score, language) VALUES
('https://www.healthline.com/rss', 'Healthline', 'Health information and medical news', 'health', 'medical', 0.80, 'en'),
('https://www.medicalnewstoday.com/feeds/news.xml', 'Medical News Today', 'Latest medical research and health news', 'health', 'research', 0.85, 'en');

-- Space & Astronomy Sources
INSERT OR IGNORE INTO rss_sources (url, title, description, topic, subtopic, quality_score, language) VALUES
('https://www.space.com/feeds/all', 'Space.com', 'Space exploration, astronomy and science news', 'space', 'exploration', 0.88, 'en'),
('https://spacenews.com/feed/', 'SpaceNews', 'Commercial space industry news', 'space', 'industry', 0.85, 'en'),
('https://www.nasa.gov/rss/dyn/breaking_news.rss', 'NASA Breaking News', 'Latest NASA missions and discoveries', 'space', 'nasa', 0.95, 'en');

-- Gaming Sources
INSERT OR IGNORE INTO rss_sources (url, title, description, topic, subtopic, quality_score, language) VALUES
('https://www.gamespot.com/feeds/mashup/', 'GameSpot', 'Video game news, reviews, and previews', 'gaming', 'news', 0.78, 'en'),
('https://www.ign.com/feed.xml', 'IGN', 'Gaming and entertainment news', 'gaming', 'entertainment', 0.75, 'en'),
('https://www.polygon.com/rss/index.xml', 'Polygon', 'Gaming culture and industry news', 'gaming', 'culture', 0.80, 'en');

-- Update metadata
UPDATE rss_sources SET last_checked = CURRENT_TIMESTAMP WHERE last_checked IS NULL;

---