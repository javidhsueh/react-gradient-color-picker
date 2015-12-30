'use strict';

import _ 						from 'lodash';
import ColorPicker  from 'react-colors-picker';
import d3 					from 'd3';
import React 				from 'react';

class ReactGradientColorPicker extends React.Component {

	constructor(props) {
    super(props);

    // merge props, color stops

    // width and height
    var rootWidth = 300;
    var rootHeight = 20;
    
    this.svg = null;

    var defaultStops = [
  		{offset: 0.0, color: '#00f'},
      {offset: 0.5, color: '#aaa'},
      {offset: 1.0, color: '#f00'}
    ];
    var stops = defaultStops.map(function iterator(d, idx) {
    	return {
    		idx: idx,
    		x: rootWidth * d.offset,
    		offset: d.offset,
    		color: d.color
    	}
    });
    // console.log(stops);
    this.state = {
    	rootWidth: rootWidth,
    	rootHeight: rootHeight,
      colorModel: 'rgb',
      stops: stops
    };
  }

  addHandler(mouseX) {
  	var offset = 1.0 * mouseX / this.state.rootWidth;
  	var midColor = this.colorScale(offset);
  	var newStop = {
  		idx: this.state.stops.length,
  		x: mouseX,
  		offset: offset,
  		color: midColor
  	};
  	// console.log(newStop);
  	// return ;
  	this.setState({stops: this.state.stops.concat([newStop])});
  }

  dragHandler(d) {
  	// only update handler position but not state
  	var newX = d3.event.x;
  	d.x = newX;
  	d3.select(this).attr('x', newX);
  	d3.select('#gc-cp' + d.idx)
  		.style('left', (d.x-13).toString()+'px')
  		.style('top', '20px');
  }

  dragHandlerEnd(d) {
  	var newStops = _.cloneDeep(this.state.stops);
  	var currentHandler = _.find(newStops, { 'idx': d.idx });
  	currentHandler.offset = 1.0 * d.x / this.state.rootWidth;
  	currentHandler.x = d.x;
  	// set state
    this.setState({stops: newStops});
  }

  componentDidMount() {
  	console.log('componentDidMount');
  	// get width, height
  	var rootWidth = this.refs.root.offsetWidth;
  	var newStops = _.cloneDeep(this.state.stops);
  	newStops.forEach(function iterator(d) {
  		d.x = d.offset * rootWidth;
  	});
  	this.setState({
  		rootWidth: rootWidth,
  		stops: newStops
  	});
  	console.log(this.state);

  	var self = this;
  	var clickColorMap = function clickColorMap() {
  		var mouseX = d3.mouse(this)[0];
  		self.addHandler(mouseX);
  	};

  	// init canvas
  	this.svg = d3.select('#gc-canvas')
  		.append('svg')
  		.attr('width', this.state.rootWidth)
  		.attr('height', this.state.rootHeight);
  		// .append('g');

  	this.gradient = this.svg.append('linearGradient')
      .attr('id', 'gc-gradient')
      .attr('gradientUnits', 'userSpaceOnUse')
      .attr('y1', '0')
	    .attr('y2', '0')
	    .attr('x1', '0')
	    .attr('x2', this.state.rootWidth);

    this.colorMap = this.svg.append('rect')
    	.attr('id', 'gc-color-map')
    	.attr('x', 0)
    	.attr('y', 0)
    	.attr('width', this.state.rootWidth)
    	.attr('height', this.state.rootHeight)
    	.attr('fill', 'url(#gc-gradient)')
    	.on('click', clickColorMap);

    this.refreshCanvas();
  }

  refreshCanvas() {
  	if (this.svg === null) {
  		return;
  	}
  	console.log('in refreshCanvas');
  	console.log(this.state);
  	// refresh canvas size
  	this.svg.attr('width', this.state.rootWidth)
  		.attr('height', this.state.rootHeight);

  	this.colorMap.attr('width', this.state.rootWidth)
  		.attr('height', this.state.rootHeight);

  	// refresh gradient
  	this.gradient = this.svg.select('#gc-gradient')
  		.attr('x2', this.state.rootWidth)
	  	.selectAll('stop')
      .data(this.state.stops);

    // enter
    this.gradient.enter()
    	.append('stop')
      .attr('offset', function offsetAccessor(d) {
      	return (d.offset * 100).toString()+'%';
      })
      .attr('stop-color', function colorAccessor(d) {
      	return d.color;
      });
    // update
    this.gradient
    	.attr('offset', function offsetAccessor(d) {
      	return (d.offset * 100).toString()+'%';
      })
      .attr('stop-color', function colorAccessor(d) {
      	return d.color;
      });

    // remove
    this.gradient.exit().remove();

  	// refresh handlers
  	this.handlers = this.svg.selectAll('.gc-handler')
    	.data(this.state.stops);

  	// insert new handlers
  	var drag = d3.behavior.drag()
	    .origin(Object)
	    .on('drag', this.dragHandler)
	    .on('dragend', this.dragHandlerEnd.bind(this))
		this.handlers.enter()
			.append('rect')
    	.attr('class', 'gc-handler')
    	.attr('x', function xPos(d) {
    		return d.x-2;
    	}.bind(this))
    	.attr('y', '0')
    	.attr('width', '4')
    	.attr('height', this.state.rootHeight)
    	.call(drag);

    // update existing handlers
    this.handlers
    	.attr('x', function xPos(d) {
    		return d.x-2;
    	}.bind(this));

    // remove non-exist handlers
    this.handlers.exit().remove();

    // refresh the color pickers
    this.state.stops.forEach(function iterator(s) {
    	d3.select('#gc-cp'+s.idx)
    		.style('left', (s.x-13).toString()+'px')
    		.style('top', '20px');
    });

    // refresh color scale
    var stops = this.state.stops.map(function iterator(s) {
    	return {
    		offset: s.offset,
    		color: s.color
    	};
    });
    stops.sort(function cmp(a, b) {
    	return a.offset - b.offset;
    });
    var offsets = stops.map(function iterator(s) {
    	return s.offset;
    })
    var colors = stops.map(function iterator(s) {
    	return s.color;
    });
    console.log(stops, colors);
    this.colorScale = d3.scale.linear()
    	.domain(offsets)
    	.range(colors);
  }

  render() {
  	this.refreshCanvas();

  	var colorChangeCallback = function colorChangeCallback(color, idx) {
  		var newStops = _.cloneDeep(this.state.stops);
	  	var currentHandler = _.find(newStops, { 'idx': idx });
	  	currentHandler.color = color;
	    this.setState({stops: newStops});
  	}.bind(this);
  	var colorpickers = this.state.stops.map(function iterator(s) {
  		let pickerId = 'gc-cp'+s.idx;
  		let callback = function callback(c) {
  			colorChangeCallback(c.color, s.idx);
  		};
  		var style = {
  			left: (s.x-13).toString()+'px',
  			top: '20px'
  		}
  		return (
  			<div id={pickerId} className="gc-colorpicker" style={style}>
  				<ColorPicker animation="slide-up" color={s.color} onChange={callback}/>
  			</div>
  		);
  	}.bind(this));
    return (
	    <div className="gc-container" ref="root" >
	    	{colorpickers}
	    	<div id="gc-canvas">
	    	</div>
	    </div>
    );
  }
}

module.exports = ReactGradientColorPicker;