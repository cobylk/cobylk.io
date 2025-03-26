function setupTooltips() {
  const tooltipElements = document.querySelectorAll('.tooltip');
  const tooltips = new Map<Element, HTMLDivElement>(); // Store tooltip elements by their parent
  let tooltipCounter = 1;
  
  tooltipElements.forEach(element => {
    const tooltipText = element.getAttribute('data-tooltip');
    if (!tooltipText) return;
    
    // Set the number as a data attribute (will be displayed via CSS)
    element.setAttribute('data-number', tooltipCounter.toString());
    tooltipCounter++;
    
    // Create tooltip element
    const tooltipEl = document.createElement('div');
    tooltipEl.className = 'tooltip-text';
    tooltipEl.textContent = tooltipText;
    document.body.appendChild(tooltipEl);
    
    // Store reference to tooltip element
    tooltips.set(element, tooltipEl);
    
    // Check if we're on mobile
    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    
    if (isMobile) {
      // Handle click events for mobile
      element.addEventListener('click', (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        
        const tooltip = tooltips.get(element);
        if (!tooltip) return;
        
        // Toggle active state
        const isActive = element.classList.contains('active');
        
        // Hide all tooltips first
        tooltipElements.forEach(el => {
          el.classList.remove('active');
          const tt = tooltips.get(el);
          if (tt) tt.classList.remove('visible');
        });
        
        if (!isActive) {
          element.classList.add('active');
          tooltip.classList.add('visible');
          
          // Position tooltip
          const rect = element.getBoundingClientRect();
          tooltip.style.left = rect.left + (rect.width / 2) + 'px';
          tooltip.style.top = (rect.bottom + window.scrollY) + 'px';
        }
      });
      
      // Close tooltip when clicking outside
      document.addEventListener('click', (e: Event) => {
        if (!e.target || !(e.target as Element).closest('.tooltip')) {
          tooltipElements.forEach(el => {
            el.classList.remove('active');
            const tt = tooltips.get(el);
            if (tt) tt.classList.remove('visible');
          });
        }
      });
    } else {
      // Desktop hover behavior
      element.addEventListener('mouseenter', (e: Event) => {
        const tooltip = tooltips.get(element);
        if (!tooltip) return;
        const mouseEvent = e as MouseEvent;
        tooltip.style.left = (mouseEvent.clientX + 15) + 'px';
        tooltip.style.top = (mouseEvent.clientY + 15) + 'px';
        tooltip.classList.add('visible');
      });
      
      element.addEventListener('mousemove', (e: Event) => {
        const tooltip = tooltips.get(element);
        if (!tooltip) return;
        const mouseEvent = e as MouseEvent;
        tooltip.style.left = (mouseEvent.clientX + 15) + 'px';
        tooltip.style.top = (mouseEvent.clientY + 15) + 'px';
      });
      
      element.addEventListener('mouseleave', () => {
        const tooltip = tooltips.get(element);
        if (!tooltip) return;
        tooltip.classList.remove('visible');
      });
    }
  });
}

// Run setup on initial load and after navigation
document.addEventListener("nav", setupTooltips); 