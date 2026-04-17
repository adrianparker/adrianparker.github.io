/**
 * Smoke tests for the Eleventy build process.
 * Validates that the build completes without errors and produces expected output.
 */

const { expect } = require('chai');
const fs = require('fs');
const path = require('path');

describe('Smoke Tests - Build Validation', function() {
  this.timeout(30000); // Build can take a while

  it('should produce _site directory with expected structure', function() {
    const siteDir = path.join(process.cwd(), '_site');
    expect(fs.existsSync(siteDir)).to.be.true;
  });

  it('should generate index.html at root', function() {
    const indexPath = path.join(process.cwd(), '_site/index.html');
    expect(fs.existsSync(indexPath)).to.be.true;
  });

  it('should generate blog post HTML files', function() {
    const postDir = path.join(process.cwd(), '_site/posts/Last-Ever-Last-Ever');
    expect(fs.existsSync(postDir)).to.be.true;
    
    const postHtml = path.join(postDir, 'index.html');
    expect(fs.existsSync(postHtml)).to.be.true;
  });

  it('should generate CSS files', function() {
    const cssPath = path.join(process.cwd(), '_site/index.css');
    expect(fs.existsSync(cssPath)).to.be.true;
  });

  it('should include video-wrapper CSS class in generated styles', function() {
    const cssPath = path.join(process.cwd(), '_site/index.css');
    const cssContent = fs.readFileSync(cssPath, 'utf8');
    expect(cssContent).to.include('.video-wrapper');
  });

  it('should render video shortcode in blog post HTML', function() {
    const postHtml = path.join(process.cwd(), '_site/posts/Last-Ever-Last-Ever/index.html');
    const htmlContent = fs.readFileSync(postHtml, 'utf8');
    
    // Check that the shortcode was rendered to HTML
    expect(htmlContent).to.include('class="video-wrapper"');
    expect(htmlContent).to.include('<video');
    expect(htmlContent).to.include('d200vq1iaq5hh.cloudfront.net');
  });

  it('should not contain raw shortcode syntax in HTML output', function() {
    const postHtml = path.join(process.cwd(), '_site/posts/Last-Ever-Last-Ever/index.html');
    const htmlContent = fs.readFileSync(postHtml, 'utf8');
    
    // Ensure shortcode was processed, not left as raw text
    expect(htmlContent).to.not.include('{% video');
  });

  it('should generate feed.xml for RSS', function() {
    const feedPath = path.join(process.cwd(), '_site/feed.xml');
    expect(fs.existsSync(feedPath)).to.be.true;
  });
});
