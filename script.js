class IndiaGDPChart {
    constructor(containerId) {
        this.containerId = containerId;
        this.dimensions = {
            width: 960,
            height: 540,
            padding: 70
        };
        // Use CSS variables for colors
        this.colors = {
            primary: getComputedStyle(document.documentElement).getPropertyValue('--accent-primary').trim(),
            secondary: getComputedStyle(document.documentElement).getPropertyValue('--accent-secondary').trim(),
            text: getComputedStyle(document.documentElement).getPropertyValue('--text-primary').trim(),
            success: getComputedStyle(document.documentElement).getPropertyValue('--success').trim(),
            danger: getComputedStyle(document.documentElement).getPropertyValue('--danger').trim()
        };
        this.currentDataset = null;
        this.currentRange = 'all';
    }

    async fetchData() {
        const url = "https://api.worldbank.org/v2/country/IND/indicator/NY.GDP.MKTP.CD?format=json&per_page=60";
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            this.currentDataset = data[1].map(item => ({
                date: item.date,
                value: parseFloat(item.value) / 1e9,
                year: new Date(item.date).getFullYear()
            }));
            return this.filterDataByRange(this.currentRange);
        } catch (error) {
            this.showError("Failed to fetch India's GDP data. Please try again later.");
            throw error;
        }
    }

    filterDataByRange(range) {
        if (!this.currentDataset) return [];
        const currentYear = new Date().getFullYear();
        switch (range) {
            case '5y':
                return this.currentDataset.filter(d => d.year >= currentYear - 5);
            case '10y':
                return this.currentDataset.filter(d => d.year >= currentYear - 10);
            default:
                return this.currentDataset;
        }
    }

    showLoading(show = true) {
        const loader = document.getElementById('loading');
        if (show) {
            loader.style.display = 'flex';
            loader.innerHTML = `
                <div class="loader"></div>
                <p>Analyzing Economic Data...</p>
            `;
        } else {
            loader.style.display = 'none';
        }
    }

    showError(message) {
        const errorElement = document.getElementById('error');
        errorElement.innerHTML = `
            <i class="ri-error-warning-fill"></i>
            <p>${message}</p>
        `;
        errorElement.style.display = 'flex';
    }

    updateStats(dataset) {
        if (!dataset.length) return;

        const currentGDP = dataset[0].value;
        const previousGDP = dataset[1]?.value || 0;
        const growthRate = previousGDP ? ((currentGDP - previousGDP) / previousGDP * 100).toFixed(2) : 0;

        document.getElementById('current-gdp').innerHTML = `
            <span class="stat-value">${this.formatCurrency(currentGDP)}</span>
            <span class="stat-label">Current GDP</span>
        `;

        document.getElementById('growth-rate').innerHTML = `
            <span class="stat-value ${growthRate >= 0 ? 'positive' : 'negative'}">
                ${growthRate}%
                <i class="ri-arrow-${growthRate >= 0 ? 'up' : 'down'}-line"></i>
            </span>
            <span class="stat-label">Annual Growth</span>
        `;

        document.getElementById('global-rank').innerHTML = `
            <span class="stat-value">5th</span>
            <span class="stat-label">Global Economy</span>
        `;
    }

    formatCurrency(value) {
        const inrValue = value * 75; // Approximate USD to INR conversion
        if (inrValue >= 1000) {
            return `₹${(inrValue/1000).toFixed(2)} Trillion`;
        }
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0,
        }).format(inrValue);
    }

    createChart(dataset) {
        const { width, height, padding } = this.dimensions;
        
        // Clear previous chart
        d3.select(this.containerId).selectAll('*').remove();

        // Update stats
        this.updateStats(dataset);

        // Create SVG container
        const svg = d3.select(this.containerId)
            .append('svg')
            .attr('viewBox', `0 0 ${width} ${height}`)
            .attr('preserveAspectRatio', 'xMidYMid meet')
            .attr('class', 'chart-svg');

        // Create gradient
        const gradient = svg.append('defs')
            .append('linearGradient')
            .attr('id', 'bar-gradient')
            .attr('gradientTransform', 'rotate(90)');

        gradient.append('stop')
            .attr('offset', '0%')
            .attr('stop-color', this.colors.primary);

        gradient.append('stop')
            .attr('offset', '100%')
            .attr('stop-color', this.colors.secondary);

        // Create scales
        const xScale = d3.scaleTime()
            .domain(d3.extent(dataset, d => new Date(d.date)))
            .range([padding, width - padding]);

        const yScale = d3.scaleLinear()
            .domain([0, d3.max(dataset, d => d.value) * 1.1])
            .range([height - padding, padding]);

        // Create axes
        const xAxis = d3.axisBottom(xScale)
            .ticks(d3.timeYear.every(5))
            .tickSize(-height + 2 * padding);

        const yAxis = d3.axisLeft(yScale)
            .ticks(10)
            .tickFormat(d => `₹${d}B`)
            .tickSize(-width + 2 * padding);

        // Add axes
        svg.append('g')
            .attr('class', 'grid x-grid')
            .attr('transform', `translate(0, ${height - padding})`)
            .call(xAxis);

        svg.append('g')
            .attr('class', 'grid y-grid')
            .attr('transform', `translate(${padding}, 0)`)
            .call(yAxis);

        // Create tooltip
        const tooltip = d3.select('body')
            .append('div')
            .attr('class', 'tooltip')
            .style('opacity', 0);

        // Add bars with animation
        const barWidth = (width - 2 * padding) / dataset.length * 0.8;

        svg.selectAll('rect')
            .data(dataset)
            .enter()
            .append('rect')
            .attr('class', 'bar')
            .attr('x', d => xScale(new Date(d.date)))
            .attr('y', height - padding)
            .attr('width', barWidth)
            .attr('height', 0)
            .style('fill', 'url(#bar-gradient)')
            .transition()
            .duration(1000)
            .delay((d, i) => i * 50)
            .attr('y', d => yScale(d.value))
            .attr('height', d => height - padding - yScale(d.value));

        // Add hover effects
        svg.selectAll('rect')
            .on('mouseover', (event, d) => {
                d3.select(event.currentTarget)
                    .transition()
                    .duration(200)
                    .style('filter', 'brightness(1.2)');

                tooltip.transition()
                    .duration(200)
                    .style('opacity', 1);

                tooltip.html(`
                    <div class="tooltip-header">${d.date}</div>
                    <div class="tooltip-body">
                        <div class="tooltip-row">
                            <span>GDP:</span>
                            <span>${this.formatCurrency(d.value)}</span>
                        </div>
                        <div class="tooltip-row">
                            <span>USD:</span>
                            <span>$${d.value.toFixed(1)}B</span>
                        </div>
                    </div>
                `)
                .style('left', `${event.pageX + 10}px`)
                .style('top', `${event.pageY - 28}px`);
            })
            .on('mouseout', (event) => {
                d3.select(event.currentTarget)
                    .transition()
                    .duration(200)
                    .style('filter', 'none');

                tooltip.transition()
                    .duration(500)
                    .style('opacity', 0);
            });

        // Add axis labels
        svg.append('text')
            .attr('class', 'axis-label')
            .attr('transform', 'rotate(-90)')
            .attr('x', -height/2)
            .attr('y', padding/3)
            .style('text-anchor', 'middle')
            // .text('GDP (Billions of ₹)');

        svg.append('text')
            .attr('class', 'axis-label')
            .attr('x', width/2)
            .attr('y', height - padding/4)
            .style('text-anchor', 'middle')
            .text('Year');
    }

    async initialize() {
        this.showLoading(true);
        try {
            const dataset = await this.fetchData();
            this.showLoading(false);
            this.createChart(dataset);

            // Initialize time range controls
            this.initializeControls();
        } catch (error) {
            this.showLoading(false);
            console.error("Failed to initialize chart:", error);
        }
    }

    initializeControls() {
        document.querySelectorAll('.control-btn').forEach(button => {
            button.addEventListener('click', async () => {
                const range = button.getAttribute('data-range');
                this.currentRange = range;
                
                document.querySelectorAll('.control-btn').forEach(btn => 
                    btn.classList.remove('active'));
                button.classList.add('active');

                const filteredData = this.filterDataByRange(range);
                this.createChart(filteredData);
            });
        });

        // Theme switching
        document.getElementById('theme-switch')?.addEventListener('click', () => {
            document.body.classList.toggle('light-theme');
        });
    }
}

// Initialize the chart when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const chart = new IndiaGDPChart('#chart-container');
    chart.initialize();
});