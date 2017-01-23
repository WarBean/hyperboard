var refresh_data = function(response) {
    for (var name in response) {
        if (response[name] == 'deleted') {
            delete name2series[name];
            delete name2visible_curve[name];
        } else {
            name2series[name] = response[name];
        }
    }
    var new_hypername2values = {};
    var old_hypername2values = hypername2values;
    for (var name in name2series) {
        var hyperparameters = name2series[name].hyperparameters;
        for (var hypername in hyperparameters) {
            if (! (hypername in new_hypername2values)) {
                new_hypername2values[hypername] = {};
            }
            var hypervalue = hyperparameters[hypername];
            var selected;
            if (hypername in old_hypername2values && hypervalue in old_hypername2values[hypername]) {
                selected = old_hypername2values[hypername][hypervalue];
            } else {
                selected = 1;
            }
            new_hypername2values[hypername][hypervalue] = selected;
        }
    }
    hypername2values = new_hypername2values;
}

var refresh_visible = function() {
    for (var name in name2series) {
        name2visible_row[name] = true;
        var hyperparameters = name2series[name].hyperparameters;
        for (var hypername in hyperparameters) {
            var hypervalue = hyperparameters[hypername];
            var selected = hypername2values[hypername][hypervalue];
            if (!selected) {
                name2visible_row[name] = false;
                break;
            }
        }
    }
    for (var name in name2series) {
        if (hidden_names.has(name)) {
            name2visible_curve[name] = false;
        } else {
            name2visible_curve[name] = name2visible_row[name];
        }
    }
    //for (var name in name2series) {
    //    if (hidden_names.has(name)) {
    //        name2visible_curve[name] = false;
    //    } else {
    //        name2visible_curve[name] = true;
    //        var hyperparameters = name2series[name].hyperparameters;
    //        for (var hypername in hyperparameters) {
    //            var hypervalue = hyperparameters[hypername];
    //            var selected = hypername2values[hypername][hypervalue];
    //            if (!selected) {
    //                name2visible_curve[name] = false;
    //                break;
    //            }
    //        }
    //    }
    //}
}

var refresh_curve = function() {
    var visible_names = [];
    var all_names = [];
    for (var name in name2visible_curve) {
        if (name2visible_curve[name]) {
            visible_names.push(name);
        }
        all_names.push(name);
    }

    var svg = d3.select("svg");
    svg.selectAll('*').remove();
    if (visible_names.length == 0) {
        return;
    }

    metric2setup = {};
    var all_x_min = Number.POSITIVE_INFINITY;
    var all_x_max = Number.NEGATIVE_INFINITY;
    visible_names.forEach(function (name) {
        var series = name2series[name];
        if (!(series.metric in metric2setup)) {
            metric2setup[series.metric] = {
                'y_min': Number.POSITIVE_INFINITY,
                'y_max': Number.NEGATIVE_INFINITY,
            };
        }
        var setup = metric2setup[series.metric];
        var x_min = d3.min(series.records, function(record) { return record[0]; });
        var x_max = d3.max(series.records, function(record) { return record[0]; });
        var y_min = d3.min(series.records, function(record) { return record[1]; });
        var y_max = d3.max(series.records, function(record) { return record[1]; });
        all_x_min = Math.min(all_x_min, x_min);
        all_x_max = Math.max(all_x_max, x_max);
        setup.y_min = Math.min(setup.y_min, y_min);
        setup.y_max = Math.max(setup.y_max, y_max);
    });

    var axis_count = Object.keys(metric2setup).length;
    var axis_offset = 40,
        svg_height = 600,
        svg_width = 960 + (axis_count - 1) * axis_offset;
    var margin = { top: 60, right: 60, bottom: 60, left: 60 },
        canvas_width = svg_width - margin.left - margin.right,
        canvas_height = svg_height - margin.top - margin.bottom;
        x_axis_width = canvas_width - (axis_count - 1) * axis_offset
    svg.attr("width", svg_width).attr("height", svg_height);
    if (visible_names.length == 0) {
        return;
    }
    var canvas = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    var x = d3.scaleLinear().range([0, x_axis_width]);
    x.domain([all_x_min, all_x_max]);
    for (var metric in metric2setup) {
        var setup = metric2setup[metric];
        setup.y = d3.scaleLinear().range([canvas_height, 0]);
        setup.y.domain([setup.y_min, setup.y_max]);
    }
    z = d3.scaleOrdinal(d3.schemeCategory10);
    z.domain(all_names);

    var shift = - axis_offset;
    for (var metric in metric2setup) {
        var setup = metric2setup[metric];
        shift = shift + axis_offset;
        canvas.append("g")
            .attr("class", "axis axis--y")
            .attr("transform", "translate(" + shift + ",0)")
            .call(d3.axisLeft(setup.y))
            .append("text")
            .attr("x", 10)
            .attr("y", 0)
            .style("text-anchor", "start")
            .attr("transform", "rotate(-90)")
            .attr("fill", "#000")
            .text(metric);
    }
    canvas.append("g")
        .attr("class", "axis axis--x")
        .attr("transform", "translate(" + shift + "," + canvas_height + ")")
        .call(d3.axisBottom(x));

    canvas.selectAll(".curve")
        .data(visible_names)
        .enter()
        .append("path")
        .attr("class", "curve")
        .attr("transform", "translate(" + shift + ",0)")
        .attr("d", function(name) {
            var metric = name2series[name].metric;
            var d3line = d3.line()
                .x(function(record) { return x(record[0]); })
                .y(function(record) { return metric2setup[metric].y(record[1]); });
            return d3line(name2series[name].records);
        })
        .style("stroke", function(name) { return z(name); });
}

var refresh_filter = function() {
    var last_child;
    var $select_outer_divs = $('#filter div.select_outer_div');
    for (var i = $select_outer_divs.length - 1; i >= 0; i --) {
        $div = $select_outer_divs[i];
        if (! ($div.id in hypername2values)) {
            $div.remove();
        }
    }
    for (var hypername in hypername2values) {
        var $div = $("#filter div[id='" + hypername + "']");
        var $options = $("#filter div[id='" + hypername + "'] select option");
        var remove = false, insert = false;
        if ($div.length == 0) {
            insert = true;
        } else if ($options.length != Object.keys(hypername2values[hypername]).length) {
            remove = true;
            insert = true;
        } else {
            for (var i = $options.length - 1; i >= 0; i --) {
                if (! ($options[i].value in hypername2values[hypername])) {
                    remove = true;
                    insert = true;
                    break;
                }
            }
        }
        var last_selected = {};
        if (remove) {
            $div.remove();
            for (var i = $options.length - 1; i >= 0; i --) {
                if ($options[i].selected) {
                    last_selected[$options[i].value] = 1;
                } else {
                    last_selected[$options[i].value] = 0;
                }
            }
        }
        if (insert) {
            var select_html = ['<select multiple="multiple" class="multiselect">'];
            for (var hypervalue in hypername2values[hypername]) {
                if ((! (hypervalue in last_selected)) || hypername2values[hypername][hypervalue] == 1) {
                    select_html.push('<option selected="selected" value="' + hypervalue + '">' + hypervalue + '</option>');
                } else {
                    select_html.push('<option value="' + hypervalue + '">' + hypervalue + '</option>');
                }
            }
            select_html.push('</select>');
            select_html = select_html.join('');
            var inner_div_html = select_html;
            var text_div_html = '<div class="select_text_div">' + hypername + '</div>';
            var outer_div_html = '<div class="select_outer_div" id="' + hypername + '">' + text_div_html + inner_div_html + '</div>';
            $div = $(outer_div_html);
            if (last_child == undefined) {
                $('#filter').append($div);
            } else {
                $div.insertAfter(last_child);
            }
            $("#filter div[id='" + hypername + "'] select").multipleSelect({
                onClick: function(view) {
                    var hypername = view.instance.$parent.parent().attr("id");
                    var selected = new Set(view.instance.getSelects());
                    for (var hypervalue in hypername2values[hypername]) {
                        if (selected.has(hypervalue.toString())) {
                            hypername2values[hypername][hypervalue] = 1;
                        } else {
                            hypername2values[hypername][hypervalue] = 0;
                        }
                    }
                    refresh_visible();
                    refresh_curve();
                    refresh_table();
                }
            });
            last_child = $div;
        } else {
            last_child = $div;
        }
    }
}

var refresh_table = function() {
    $('#out-most-div').css('min-height', $('#out-most-div').height());
    $('#table').bootstrapTable('destroy');
    var columns = [];
    for (var hypername in hypername2values) {
        columns.push({
            field: hypername,
            title: hypername,
            align: 'center',
            valign: 'middle'
        });
    }
    columns.push({
        field: "color",
        title: "color",
        align: 'center',
        valign: 'middle'
    })
    columns.push({
        field: "operation",
        title: "operation",
        align: 'center',
        valign: 'middle',
    })

    var visible_names = [];
    for (var name in name2visible_row) {
        if (name2visible_row[name]) {
            visible_names.push(name);
        }
    }

    var rows = [];
    visible_names.forEach(function(name) {
        var row = {};
        var hyperparameters = name2series[name].hyperparameters;
        for (var hypername in hypername2values) {
            if (hypername in hyperparameters) {
                row[hypername] = hyperparameters[hypername];
            } else {
                row[hypername] = '-';
            }
        }
        var records = name2series[name].records;

        var color_html = '<div class="color" style="background-color: ' + z(name) + '"></div>';
        row['color'] = color_html;

        var button_class, button_text;
        if (hidden_names.has(name)) {
            button_class = 'btn-default';
            button_text = 'Hidden';
        } else {
            button_class = 'btn-primary';
            button_text = 'Shown';
        }
        var operation_html = [
            '<div class="btn-group-container">',
            '<div class="btn-group" role="group" aria-label="...">',
                '<button type="button" id="visibility ' + name + '" class="btn ' + button_class + ' control-visibility">' + button_text + '</button>',
                '<button type="button" id="delete ' + name + '" class="btn btn-danger control-delete">Delete from Server</button>',
            '</div>',
            '</div>',
        ].join('');
        row['operation'] = operation_html
        rows.push(row);
    });
    $('#table').bootstrapTable();
    $('#table').bootstrapTable('refreshOptions', {
        columns: columns,
        data: rows,
    });
    $('button.btn').on('click', function(event) {
        var button_id = event.target.id;
        var i = button_id.indexOf(' ');
        var operation = button_id.substr(0, i);
        var name = button_id.substr(i + 1);
        if (operation == 'visibility') {
            if (hidden_names.has(name)) {
                hidden_names.delete(name);
                $('button[id="' + button_id + '"]').attr('class', 'btn btn-primary');
                $('button[id="' + button_id + '"]').text('Shown');
            } else {
                hidden_names.add(name);
                $('button[id="' + button_id + '"]').attr('class', 'btn btn-default');
                $('button[id="' + button_id + '"]').text('Hidden');
            }
            refresh_visible();
            refresh_curve();
        } else if (operation == 'delete') {
            $.get(
                '/delete',
                { name: name },
                function(response) {
                    clearTimeout(timeout_id);
                    request_for_update();
                }
            );
        } else {
            console.log('unknown operation: ' + operation);
        }
    })
    $('#out-most-div').css('min-height', 0);
}

var request_for_update = function() {
    var name2max_index = {};
    for (var name in name2series) {
        var records = name2series[name]['records'];
        name2max_index[name] = d3.max(records, function(record) { return record[0]; });
    }
    $.getJSON(
        '/update',
        {
            name2max_index: JSON.stringify(name2max_index),
            max_sample_count: max_sample_count,
            smooth_window: smooth_window,
        },
        function(response) {
            refresh_data(response);
            refresh_visible();
            refresh_curve();
            refresh_filter();
            refresh_table();
        }
    );
    timeout_id = setTimeout(request_for_update, timeout);
}

window.onload = function () {
    name2series = {};
    name2visible_curve = {};
    name2visible_row = {};
    hidden_names = new Set();
    hypername2values = {};

    timeout_id = 0;
    timeout = Math.max(0, +$('input#interval')[0].value);
    $('input#interval').on('change', function(event) {
        clearTimeout(timeout_id);
        timeout = Math.max(0, +$('input#interval')[0].value);
        request_for_update();
    });

    max_sample_count = $('input#sample')[0].value
    smooth_window = $('input#window')[0].value
    $('input#sample').on('change', function(event) {
        clearTimeout(timeout_id);
        max_sample_count = event.target.value;
        request_for_update();
    });
    $('input#window').on('change', function(event) {
        clearTimeout(timeout_id);
        smooth_window = event.target.value;
        request_for_update();
    });

    request_for_update();
}
