function setupTooltips() {
  // Remove any existing tooltips first
  document.querySelectorAll('.tooltip-text').forEach(el => el.remove());
  
  const tooltipElements = document.querySelectorAll('.tooltip');
  const tooltips = new Map<Element, HTMLDivElement>();
  let tooltipCounter = 1;
  let activeTooltip: Element | null = null;
  
  tooltipElements.forEach(element => {
    const tooltipText = element.getAttribute('data-tooltip');
    if (!tooltipText) return;
    
    element.setAttribute('data-number', tooltipCounter.toString());
    tooltipCounter++;
    
    const tooltipEl = document.createElement('div');
    tooltipEl.className = 'tooltip-text';
    tooltipEl.textContent = tooltipText;
    document.body.appendChild(tooltipEl);
    tooltips.set(element, tooltipEl);
    
    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    
    if (isMobile) {
      element.addEventListener('click', (e: Event) => {
        // Check if the element is a link (has an href attribute)
        const isLink = element.hasAttribute('href');

        // Only prevent default for non-links
        if (!isLink) {
          e.preventDefault();
        }
        // Stop propagation regardless to avoid closing tooltip immediately
        e.stopPropagation();
        
        // If it is a link, allow default navigation and do nothing else
        if (isLink) {
          return;
        }

        const tooltip = tooltips.get(element);
        if (!tooltip) return;
        
        // If this tooltip is already active, hide it
        if (activeTooltip === element) {
          element.classList.remove('active');
          tooltip.classList.remove('visible');
          activeTooltip = null;
          return;
        }
        
        // Hide any active tooltip
        if (activeTooltip) {
          activeTooltip.classList.remove('active');
          const activeTooltipEl = tooltips.get(activeTooltip);
          if (activeTooltipEl) activeTooltipEl.classList.remove('visible');
        }
        
        // Show this tooltip
        element.classList.add('active');
        tooltip.classList.add('visible');
        activeTooltip = element;
        
        // Position tooltip under the element
        const rect = element.getBoundingClientRect();
        const tooltipWidth = tooltip.offsetWidth;
        const tooltipHeight = tooltip.offsetHeight;
        const viewportWidth = window.innerWidth;
        const margin = 10; // Safety margin from screen edges

        // Calculate initial centered position
        let left = rect.left + (rect.width / 2);
        const top = rect.bottom + window.scrollY + 5; // 5px gap below the element
        
        // Calculate potential overflows
        const tooltipLeftEdge = left - tooltipWidth / 2;
        const tooltipRightEdge = left + tooltipWidth / 2;
        
        let offsetX = 0; // The offset needed to keep tooltip within bounds

        if (tooltipLeftEdge < margin) {
          // Too far left
          offsetX = margin - tooltipLeftEdge;
        } else if (tooltipRightEdge > viewportWidth - margin) {
          // Too far right
          offsetX = (viewportWidth - margin) - tooltipRightEdge;
        }
        
        // Apply position and adjust transform if needed
        tooltip.style.top = `${top}px`;
        tooltip.style.left = `${left}px`; // Still set left for CSS transform origin
        tooltip.style.transform = `translateX(calc(-50% + ${offsetX}px))`;
      });
    } else {
      // Desktop hover behavior
      element.addEventListener('mouseenter', (e: Event) => {
        const tooltip = tooltips.get(element);
        if (!tooltip) return;
        const mouseEvent = e as MouseEvent;
        positionTooltip(tooltip, mouseEvent);
        tooltip.classList.add('visible');
      });
      
      element.addEventListener('mousemove', (e: Event) => {
        const tooltip = tooltips.get(element);
        if (!tooltip) return;
        const mouseEvent = e as MouseEvent;
        positionTooltip(tooltip, mouseEvent);
      });
      
      element.addEventListener('mouseleave', () => {
        const tooltip = tooltips.get(element);
        if (!tooltip) return;
        tooltip.classList.remove('visible');
      });
    }
  });
  
  // Handle clicks outside tooltips on mobile
  if (window.matchMedia('(max-width: 768px)').matches) {
    document.addEventListener('click', (e: Event) => {
      if (!e.target || !(e.target as Element).closest('.tooltip')) {
        if (activeTooltip) {
          activeTooltip.classList.remove('active');
          const tooltip = tooltips.get(activeTooltip);
          if (tooltip) tooltip.classList.remove('visible');
          activeTooltip = null;
        }
      }
    });
  }
}

// Helper function to position tooltip relative to mouse
function positionTooltip(tooltip: HTMLElement, event: MouseEvent) {
  const margin = 10;
  const tooltipWidth = tooltip.offsetWidth;
  const tooltipHeight = tooltip.offsetHeight;
  
  // Get viewport dimensions
  const vpWidth = window.innerWidth;
  const vpHeight = window.innerHeight;
  
  // Calculate position
  let left = event.clientX + margin;
  let top = event.clientY + margin;
  
  // Check right edge
  if (left + tooltipWidth > vpWidth - margin) {
    left = event.clientX - tooltipWidth - margin;
  }
  
  // Check bottom edge
  if (top + tooltipHeight > window.scrollY + vpHeight - margin) {
    top = event.clientY - tooltipHeight - margin;
  }
  
  // Apply position
  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;
}

document.addEventListener('nav', setupTooltips);
window.addEventListener('load', setupTooltips); 