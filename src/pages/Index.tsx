const staticPosts = [
  { title: "iPhone 16 Pro Max: Top 10 Features You Need to Know", category: "iPhone", date: "Jan 5, 2024" },
  { title: "15 Best Productivity Apps for iPhone and iPad in 2024", category: "Apps", date: "Jan 4, 2024" },
  { title: "macOS Sonoma: Hidden Tips and Tricks You Didn't Know", category: "How To", date: "Jan 3, 2024" },
  { title: "Apple Watch Series 10 Review: Is It Worth the Upgrade?", category: "News", date: "Jan 2, 2024" },
  { title: "iPad Pro M4: The Ultimate Creative Tool for Professionals", category: "News", date: "Jan 1, 2024" },
  { title: "AirPods Pro 3 Rumors: What to Expect from Apple's Next Earbuds", category: "News", date: "Dec 31, 2023" },
];

const Index = () => {
  return (
    <div style={{ padding: '20px', background: '#0f172a', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      <header style={{ marginBottom: '32px', borderBottom: '1px solid #334155', paddingBottom: '20px' }}>
        <h1 style={{ color: '#ffffff', fontSize: '28px', fontWeight: 'bold', margin: 0 }}>
          iGeeksBlog
        </h1>
        <p style={{ color: '#94a3b8', fontSize: '14px', marginTop: '8px' }}>
          Your source for Apple news, tips, and reviews
        </p>
      </header>

      <main>
        <h2 style={{ color: '#ffffff', fontSize: '20px', fontWeight: '600', marginBottom: '20px' }}>
          Latest Articles
        </h2>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
          gap: '20px' 
        }}>
          {staticPosts.map((post, i) => (
            <article 
              key={i} 
              style={{ 
                background: '#1e293b', 
                color: '#ffffff', 
                padding: '24px', 
                borderRadius: '12px',
                border: '1px solid #334155'
              }}
            >
              <span style={{ 
                background: '#3b82f6', 
                color: '#ffffff',
                padding: '4px 12px', 
                borderRadius: '9999px', 
                fontSize: '12px',
                fontWeight: '500'
              }}>
                {post.category}
              </span>
              <h3 style={{ 
                marginTop: '16px', 
                fontSize: '18px', 
                fontWeight: '600',
                lineHeight: '1.4',
                color: '#ffffff'
              }}>
                {post.title}
              </h3>
              <p style={{ 
                color: '#94a3b8', 
                fontSize: '14px',
                marginTop: '12px'
              }}>
                {post.date}
              </p>
            </article>
          ))}
        </div>
      </main>

      <footer style={{ 
        marginTop: '48px', 
        paddingTop: '24px', 
        borderTop: '1px solid #334155',
        color: '#64748b',
        fontSize: '14px',
        textAlign: 'center'
      }}>
        © 2024 iGeeksBlog. All rights reserved.
      </footer>
    </div>
  );
};

export default Index;
