var refresh_data = function(response) {
    var data_changed = false;
    for (var name in response) {
        if (response[name] == 'deleted') {
            delete name2series[name];
            delete name2visible_curve[name];
            delete name2visible_row[name];
            hidden_names.delete(name);
        } else {
            name2series[name] = response[name];
        }
        data_changed = true;
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
    return data_changed;
}

var refresh_visible = function() {
    var visible_changed_row = false;
    for (var name in name2series) {
        var visible = true;
        var hyperparameters = name2series[name].hyperparameters;
        for (var hypername in hyperparameters) {
            var hypervalue = hyperparameters[hypername];
            var selected = hypername2values[hypername][hypervalue];
            if (!selected) {
                visible = false;
                break;
            }
        }
        if (name2visible_row[name] != visible) {
            visible_changed_row = true;
            name2visible_row[name] = visible;
        }
    }

    var visible_changed_curve = false;
    for (var name in name2series) {
        var visible;
        if (hidden_names.has(name)) {
            visible = false;
        } else {
            visible = name2visible_row[name];
        }
        if (name2visible_curve[name] != visible) {
            visible_changed_curve = true;
            name2visible_curve[name] = visible;
        }
    }

    return visible_changed_curve; // for now only use this
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
    d3.selectAll('div.curve_tooltip').remove();
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
        svg_height = 700,
        svg_width = 1024 + (axis_count - 1) * axis_offset;
    var margin = { top: 100, right: 60, bottom: 20, left: 60 },
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

    var div = d3.select("body").append("div")
        .attr("class", "curve_tooltip")
        .style("opacity", 0);

    var mouseover = function(name) {
        var tip_text = [];
        var hyperparameters = name2series[name].hyperparameters
        for (var hypername in hyperparameters) {
            tip_text.push(hypername + ': ' + hyperparameters[hypername]);
        }
        tip_text.push('');
        tip_text.push('metric: ' + name2series[name].metric);
        tip_text = tip_text.join('<br/>');
        div.transition()
            .duration(200)
            .style("opacity", .9);
        div .html(tip_text)
            .style("left", (d3.event.pageX) + "px")
            .style("top", (d3.event.pageY - 28) + "px");
        d3.select(this).style("stroke-width", 2);
    };

    var mouseout = function(name) {
        div.transition()
            .duration(500)
            .style("opacity", 0);
        d3.select(this).style("stroke-width", 1);
    };

    canvas.selectAll(".curve")
        .data(visible_names)
        .enter()
        .append("path")
        .on('mouseover', mouseover)
        .on('mouseout', mouseout)
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
                onClick: function(event) {
                    var hypername = event.instance.$parent.parent().attr("id");
                    var selected = new Set(event.instance.getSelects());
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
                },
            });
            var $select_all = $('div#' + hypername + ' input[data-name="selectAll"]');
            $select_all.attr('id', hypername);
            $select_all.on('click', function(event) {
                var hypername = event.target.id;
                if (event.target.checked) {
                    for (var hypervalue in hypername2values[hypername]) {
                        hypername2values[hypername][hypervalue] = 1;
                    }
                } else {
                    for (var hypervalue in hypername2values[hypername]) {
                        hypername2values[hypername][hypervalue] = 0;
                    }
                }
                refresh_visible();
                refresh_curve();
                refresh_table();
            })
            last_child = $div;
        } else {
            last_child = $div;
        }
    }
}

var refresh_table = function() {
    $('#out-most-div').css('min-height', $('#out-most-div').height());
    var $table_body = $('.fixed-table-body');
    var scroll_left = 0;
    if ($('.fixed-table-body').length != 0) {
        scroll_left = $('.fixed-table-body')[0].scrollLeft;
    }
    $('#table').bootstrapTable('destroy');
    var columns = [];
    for (var hypername in hypername2values) {
        columns.push({
            field: hypername,
            title: hypername,
            align: 'center',
            valign: 'middle',
        });
    }
    columns.push({
        field: "color",
        title: "color",
        align: 'center',
        valign: 'middle',
    });
    columns.push({
        field: "operation",
        title: "operation",
        align: 'center',
        valign: 'middle',
    });

    var visible_names = [];
    for (var name in name2visible_row) {
        if (name2visible_row[name]) {
            visible_names.push(name);
        }
    }

    var button_class, button_text;
    if (hidden_names.has('batch')) {
        button_class = 'btn-default';
        button_text = 'Hidden';
    } else {
        button_class = 'btn-primary';
        button_text = 'Shown';
    }
    var operation_html = [
        '<div class="btn-group-container">',
        '<div class="btn-group" role="group" aria-label="...">',
            '<button type="button" class="btn ' + button_class + ' batch-control-visibility">' + button_text + '</button>',
            '<button type="button" class="btn btn-danger batch-control-delete">Delete from Server</button>',
        '</div>',
        '</div>',
    ].join('');

    var rows = [];
    var row = {};
    for (var i = columns.length - 1; i > 1; i --) {
        row[columns[i].field] = '';
    }
    row[columns[0].field] = 'For all curves currently in table';
    row['color'] = '';
    row['operation'] = operation_html;
    if (visible_names.length > 0) {
        rows.push(row);
    }
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
                '<button type="button" id="' + name + '" class="btn ' + button_class + ' single-control-visibility">' + button_text + '</button>',
                '<button type="button" id="' + name + '" class="btn btn-danger single-control-delete">Delete from Server</button>',
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
    $('#table').bootstrapTable('mergeCells', {
        index: 0,
        field: columns[0].field,
        colspan: columns.length - 1,
        rowspan: 1,
    });

    $('button.single-control-visibility').on('click', function(event) {
        var name = event.target.id;
        if (hidden_names.has(name)) {
            hidden_names.delete(name);
            $(this).attr('class', 'btn btn-primary single-control-visibility');
            $(this).text('Shown');
        } else {
            hidden_names.add(name);
            $(this).attr('class', 'btn btn-default single-control-visibility');
            $(this).text('Hidden');
        }
        refresh_visible();
        refresh_curve();
    });
    $('button.batch-control-visibility').on('click', function(event) {
        if (hidden_names.has('batch')) {
            hidden_names.delete('batch');
            $('button.single-control-visibility').attr('class', 'btn btn-primary single-control-visibility');
            $('button.single-control-visibility').text('Shown');
            visible_names.forEach(function(name) { hidden_names.delete(name); })
            $(this).attr('class', 'btn btn-primary');
            $(this).text('Shown');
        } else {
            hidden_names.add('batch');
            $('button.single-control-visibility').attr('class', 'btn btn-default single-control-visibility');
            $('button.single-control-visibility').text('Hidden');
            visible_names.forEach(function(name) { hidden_names.add(name); })
            $(this).attr('class', 'btn btn-default');
            $(this).text('Hidden');
        }
        refresh_visible();
        refresh_curve();
    });
    $('button.single-control-delete').on('click', function(event) {
        var name = event.target.id;
        $.get(
            '/delete',
            { names: JSON.stringify([name]) },
            function(response) {
                clearTimeout(timeout_id);
                request_for_update();
            }
        );
    });
    $('button.batch-control-delete').on('click', function(event) {
        $.get(
            '/delete',
            { names: JSON.stringify(visible_names) },
            function(response) {
                clearTimeout(timeout_id);
                request_for_update();
            }
        );
    });

    $('#out-most-div').css('min-height', 0);
    $('.fixed-table-body')[0].scrollLeft = scroll_left;
}

var request_for_update = function() {
    var name2max_index = {};
    for (var name in name2series) {
        var records = name2series[name]['records'];
        name2max_index[name] = d3.max(records, function(record) { return record[0]; });
        name2max_index[name] = name2series[name]['server_max_index'];
    }
    $.getJSON(
        '/update',
        {
            name2max_index: JSON.stringify(name2max_index),
            max_sample_count: max_sample_count,
            smooth_window: smooth_window,
        },
        function(response) {
            var data_changed = refresh_data(response);
            var visible_changed_curve = refresh_visible();
            if (data_changed || visible_changed_curve) {
                refresh_curve();
            }
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

    $(window).scroll(function () {
        if ($(this).scrollTop() > 50) {
            $('#back-to-top').fadeIn();
        } else {
            $('#back-to-top').fadeOut();
        }
    });
    $('#back-to-top').click(function () {
        $('#back-to-top').tooltip('hide');
        $('body,html').animate({
            scrollTop: 0
        }, 200);
        return false;
    });
    $('#back-to-top').tooltip();

    request_for_update();
}
