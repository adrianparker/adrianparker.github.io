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

describe('Smoke Tests - Gig Post Type', function() {
  this.timeout(30000);

  it('should generate gigs index page', function() {
    const gigsIndexPath = path.join(process.cwd(), '_site/gigs/index.html');
    expect(fs.existsSync(gigsIndexPath)).to.be.true;
  });

  it('should generate test gig post HTML', function() {
    const gigPostDir = path.join(process.cwd(), '_site/posts/gigs/20090218-Datsuns-Astoria-London');
    expect(fs.existsSync(gigPostDir)).to.be.true;

    const gigPostHtml = path.join(gigPostDir, 'index.html');
    expect(fs.existsSync(gigPostHtml)).to.be.true;
  });

  it('should render gig metadata card in gig post', function() {
    const gigPostHtml = path.join(process.cwd(), '_site/posts/gigs/20090218-Datsuns-Astoria-London/index.html');
    const htmlContent = fs.readFileSync(gigPostHtml, 'utf8');
    expect(htmlContent).to.include('class="gig-metadata"');
    expect(htmlContent).to.include('The Datsuns');
    expect(htmlContent).to.include('Underworld');
  });

  it('should render Flickr embed in gig post', function() {
    const gigPostHtml = path.join(process.cwd(), '_site/posts/gigs/20090218-Datsuns-Astoria-London/index.html');
    const htmlContent = fs.readFileSync(gigPostHtml, 'utf8');
    expect(htmlContent).to.include('data-flickr-embed="true"');
    expect(htmlContent).to.include('embedr.flickr.com');
    expect(htmlContent).to.include('live.staticflickr.com');
  });

  it('should show gig post in home page listing', function() {
    const indexHtml = path.join(process.cwd(), '_site/index.html');
    const htmlContent = fs.readFileSync(indexHtml, 'utf8');
    expect(htmlContent).to.include('The Datsuns @ Underworld');
  });

  it('should show Gigs section with All gigs link in sidebar', function() {
    const indexHtml = path.join(process.cwd(), '_site/index.html');
    const htmlContent = fs.readFileSync(indexHtml, 'utf8');
    expect(htmlContent).to.include('All gigs...');
    expect(htmlContent).to.include('href="/gigs/"');
  });

  it('should include gig post in RSS feed', function() {
    const feedPath = path.join(process.cwd(), '_site/feed.xml');
    const feedContent = fs.readFileSync(feedPath, 'utf8');
    expect(feedContent).to.include('The Datsuns @ Underworld');
  });

  it('should include .gig-metadata CSS class in generated styles', function() {
    const cssPath = path.join(process.cwd(), '_site/index.css');
    const cssContent = fs.readFileSync(cssPath, 'utf8');
    expect(cssContent).to.include('.gig-metadata');
  });
});
