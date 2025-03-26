---
title: Coby Kassner
cssclasses:
  - hide-title
  - hide-meta
---


<script src="https://unpkg.com/feather-icons"></script>
<script>
  function initializeIcons() {
    feather.replace();
    
    // Tooltip cursor follow functionality
    const tooltipElements = document.querySelectorAll('.tooltip');
    const tooltips = new Map(); // Store tooltip elements by their parent
    
    tooltipElements.forEach(element => {
      const tooltipText = element.getAttribute('data-tooltip');
      if (!tooltipText) return;
      
      // Create tooltip element
      const tooltipEl = document.createElement('div');
      tooltipEl.className = 'tooltip-text';
      tooltipEl.textContent = tooltipText;
      document.body.appendChild(tooltipEl);
      
      // Store reference to tooltip element
      tooltips.set(element, tooltipEl);
      
      // Show tooltip on hover and initial position
      element.addEventListener('mouseenter', function(e) {
        const tooltip = tooltips.get(this);
        tooltip.style.left = (e.clientX + 15) + 'px';
        tooltip.style.top = (e.clientY + 15) + 'px';
        tooltip.classList.add('visible');
      });
      
      // Update tooltip position as cursor moves
      element.addEventListener('mousemove', function(e) {
        const tooltip = tooltips.get(this);
        tooltip.style.left = (e.clientX + 15) + 'px';
        tooltip.style.top = (e.clientY + 15) + 'px';
      });
      
      // Hide tooltip when not hovering
      element.addEventListener('mouseleave', function() {
        const tooltip = tooltips.get(this);
        tooltip.classList.remove('visible');
      });
    });
  }

  // Initialize on first load
  document.addEventListener('DOMContentLoaded', initializeIcons);
  
  // Re-initialize on page navigation
  document.addEventListener('nav', initializeIcons);
</script>

<div class="social-icons">
  <a href="https://cobylk.io/curriculum_vitae.pdf" target="_blank" class="tooltip" data-tooltip="Curriculum Vitae" data-cursor="pointer">
    <i data-feather="file-text"></i>
  </a>
  <a href="https://github.com/cobylk" target="_blank" class="tooltip" data-tooltip="GitHub Profile" data-cursor="pointer">
    <i data-feather="github"></i>
  </a>
  <a href="https://www.linkedin.com/in/cobylk" target="_blank" class="tooltip" data-tooltip="LinkedIn Profile" data-cursor="pointer">
    <i data-feather="linkedin"></i>
  </a>
  <a href="mailto:cobylkassner@gmail.com" class="tooltip" data-tooltip="Email" data-cursor="pointer">
    <i data-feather="mail"></i>
  </a>
</div>

### Hey there!
My name is Coby, and I'm a student researcher with interest in mechanistic interpretability and a broader interest in most things related to technical AI safety and alignment. In my free time, I love composing and performing classical music, hiking, and skiing.

I'm starting my undergrad [this fall](tooltip:Yes, 2025.) at (((coming soon))).

### Construction zone!
This website is very much in progress, and I plan to write much more and flesh things out in the somewhat near future. In the meantime, check out (what I have added so far) of my [research](Research), [music](Music), or personal [thoughts](Personal).


***
### Random stuff
In lieu of [actual content](tooltip:which takes time and effort to produce) (for the time being), I decided that the below would be better than more blankness. 

Here is a panoramic view I captured from the top of [Quandary Peak](https://en.wikipedia.org/wiki/Quandary_Peak).
![mountains](mountains.jpg)

This is the best animal. Because of their diet, bamboo lemurs are practically immune to cyanide.
![bamboo lemur](bamboo_lemur.png)

I challenge you to reverse-engineer what happened here
![mystery](frontflip.png)