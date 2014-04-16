/**
 * Module dependencies
 */


var debug = require('debug')('shoelace:stylus');
var fs = require('fs');
var Batch = require('batch');
var stylus = require('stylus');
var nib = require('nib');
var endsWith = require('./utils').endsWith;

var cwd = process.cwd();

module.exports = function(builder) {
  if ('function' == typeof builder.build) return compileStylus(builder, {});

  var options = builder;
  return function (builder) {
    compileStylus(builder, options);
  };
};


function compileStylus(builder, options) {
  builder.hook('before styles', function (pkg, cb) {
    if (!pkg.config.styles) return cb();

    var stylusFiles = pkg.config.styles.filter(endsWith('styl'));
    var batch = new Batch();

    stylusFiles.forEach(function (styl) {

      // only load index.styl
      if (!~styl.indexOf('index.styl')) return pkg.removeFile('styles', styl);

      batch.push(function (done) {
        var stylPath = pkg.path(styl);
        var name = styl.split('.')[0] + '.css';

        debug('compiling: %s', styl);
        var paths = [
          cwd,
          cwd + '/components',
          cwd + '/node_modules'
        ];

        var render = stylus(fs.readFileSync(stylPath, 'utf-8'))
          .set('paths', paths)
          .set('include css', true)
          .set('filename', stylPath)
          .use(nib());

        for(var key in options.set) {
          render.set(key, options.set[key]);
        }
        for(var k in options.use) {
          render.use(options.use[k]);
        }

        if (pkg.parent && pkg.parent.config.build && pkg.parent.config.build.stylus && pkg.parent.config.build.stylus.imports) {
          pkg.parent.config.build.stylus.imports.forEach(function (path) {
            var imp = pkg.parent.dir + '/' + path;
            debug('importing: %s', imp);

            render.import(imp);
          });
        }

        render.render(function (err, css) {

          if (err) return done(err);

          pkg.addFile('styles', name, css);
          pkg.removeFile('styles', styl);

          done();
        });

      });
    });

    batch.end(cb);
  });
}
