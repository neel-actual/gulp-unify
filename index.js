var path = require('path'),
    vinyl = require('vinyl'),
    through = require('through2-concurrent'),
    detective = require('detective');

module.exports = function (filename, opts) {
    var requires = {}, //store dependency tree
        contents = {}, //store file content
        new_contents = {},
        deps = {}, //for dependency sorting
        str = '';

    return through.obj({ maxConcurrency: 4 }, function (file, enc, next) {
        var content;

        // ignore empty files
        if (file.isNull()) {
            next();
            return;
        }

        // we don't do streams (yet)
        if (file.isStream()) {
            this.emit('error', new Error('gulp-concat: Streaming not supported'));
            next();
            return;
        }

        if (file.isBuffer() && opts.ignore && opts.ignore.indexOf(path.basename(file.path)) === -1) {
            content = file.contents.toString('utf8');

            //extension is ignored
            contents[file.path.replace(/\.\w+$/, '')] = content;
        }

        next();
    }, function (next) {
        var file,
            list;

        //populate requires as needed
        Object.keys(contents).forEach(function (file_path) {
            var content = contents[file_path],
                reqs = detective(content);

            new_contents[file_path] = content;
            reqs.forEach(function (req) {
                var req_path = path.join(path.dirname(file_path), req.replace(/\.\w+$/, '')),
                    req_content = contents[req_path],
                    hash_name;

                if (req_content) {
                    hash_name = path.basename(req_path) + '_' + hash(req_content);
                    requires[req_path] = requires[req_path] || hash_name;
                    new_contents[file_path] = new_contents[file_path].replace(
                        new RegExp('require\\(\\\''+ req.replace('.', '\\.') + '\\\'\\)', 'g'),
                        hash_name
                    );
                }
                if (contents[req_path]) {
                    deps[req_path] = deps[req_path] || [];
                    deps[req_path].push(file_path);
                }
            });
        });

        //get files we want to bundle and replace the content, encapsulate it and assign it to a unique variable
        list = createEdges(deps); //create a topological map based on dependency
        tsort(list).reverse().forEach(function (filename) {
            var content = new_contents[filename];

            if (requires[filename]) {
                str += '\n//' + filename + '\n var ' + requires[filename] +' = (function () { ' + content.replace(/module\.exports *=/g, 'return') + '\n})();\n\n'
            }
        });
        // Object.keys(contents).forEach(function (filename) {
        //     var content = contents[filename];
        //
        //     if (requires[filename]) {
        //         str += '\n//' + filename + '\n var ' + requires[filename] +' = (function () { ' + content.replace(/module\.exports *=/g, 'return') + '\n})();\n\n'
        //     }
        // });

        Object.keys(new_contents).forEach(function (filename) {
            var content = new_contents[filename];

            if (!requires[filename]) {
                str += content;
            }
        });

        file = new vinyl({
            path: filename,
            contents: Buffer.from(str)
        });

        this.push(file);
        next();
    });
};

//topological dependency sorting
function tsort(edges) {
    var nodes = {},
        sorted = [],
        visited = {},
        Node = function (id) {
            this.id = id;
            this.afters = [];
        };

    edges.forEach(function (v) {
        var from = v[0],
            to = v[1];

        if (!nodes[from]) nodes[from] = new Node(from);
        if (!nodes[to]) nodes[to] = new Node(to);
        nodes[from].afters.push(to);
    });

    Object.keys(nodes).forEach(function visit(idstr, ancestors) {
        var node = nodes[idstr],
            id = node.id;

        if (visited[idstr]) return;
        if (!Array.isArray(ancestors)) ancestors = [];

        ancestors.push(id);
        visited[idstr] = true;
        node.afters.forEach(function (afterID) {
            if (ancestors.indexOf(afterID) >= 0)
                throw new Error('closed chain : ' + afterID + ' is in ' + id);
            visit(afterID.toString(), ancestors.map(function (v) { return v }));
        });
        sorted.unshift(id);
    });

    return sorted;
}

function createEdges (deps) {
    var result = [];

    Object.keys(deps).forEach(function (key) {
        deps[key].forEach(function (n) {
            result.push([n, key]);
        });
    });

    return result;
}

//hash function for unique identification
function hash(str) {
    var val = 0;

    if (str.length === 0) { return val; }

    for (var i = 0; i < str.length; i++) {
        var char = str.charCodeAt(i);
        val = ((val<<5)-val)+char;
        val = val & val; // Convert to 32bit integer
    }

    return String(val).replace(/-/g, '0');
}