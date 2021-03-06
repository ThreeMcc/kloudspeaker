/*!
 * Kloudspeaker Gruntfile
 *
 * Copyright 2015- Samuli Järvelä
 * Released under GPL License.
 *
 * License: http://www.kloudspekaer.org/license.php
 */

module.exports = function(grunt) {
    'use strict';

    // Force use of Unix newlines
    grunt.util.linefeed = '\n';

    RegExp.quote = function(string) {
        return string.replace(/[-\\^$*+?.()|[\]{}]/g, '\\$&');
    };

    var pkg = grunt.file.readJSON('package.json');

    // Project configuration.
    grunt.initConfig({

        // Metadata.
        pkg: pkg,
        banner: '/*!\n' + ' * Kloudspeaker v<%= pkg.version %> (<%= pkg.homepage %>)\n' + ' * Copyright 2015- <%= pkg.author %>\n' + ' * Licensed under <%= _.pluck(pkg.licenses, "type") %> (<%= _.pluck(pkg.licenses, "url") %>)\n' + ' */\n',

        // Task configuration.
        clean: {
            dist: 'dist'
        },

        jshint: {
            options: {
                jshintrc: 'js/.jshintrc'
            },
            grunt: {
                src: [] //TODO clean up 'Gruntfile.js']
            },
            src: {
                src: ['js/*.js', 'js/kloudspeaker/**/*.js', 'js/kloudspeaker/**/*.js', 'js/widgets/**/*.js']
            },
            test: {
                src: [] //'js/tests/unit/*.js'
            },
            assets: {
                src: []
            }
        },

        jscs: {
            options: {
                config: 'js/.jscs.json',
            },
            grunt: {
                src: [] //'Gruntfile.js']
            },
            src: {
                src: 'js/**.js' //TODO clean 'js/*.js'
            },
            test: {
                src: [] //'js/tests/unit/*.js'
            },
            assets: {
                src: []
            }
        },

        concat: {
            options: {
                banner: '<%= banner %>\n',
                stripBanners: false
            },
            kloudspeaker: {
                src: [
                    'js/lib/require.js',
                    'js/init.js',
                    //'js/ui.js',
                    //'js/loginview.js',
                    //'js/mainview.js',
                    'js/plugins.js',
                    //'js/configview.js',
                    //'js/uploader.js',
                    'js/module-config.js',
                    'out/modules.js',
                ],
                dest: 'dist/js/<%= pkg.name %>.js'
            },
            full: {
                src: [
                    'js/lib/jquery.min.js',
                    'js/lib/underscore.js',
                    'js/lib/json.js',
                    'js/lib/jquery.tmpl.min.js',
                    'js/lib/jquery-ui.js',
                    'js/lib/bootstrap.js',
                    'js/lib/bootstrap-datetimepicker.js',
                    'js/lib/bootstrap-lightbox.js',
                    'js/lib/modernizr.js',
                    'js/lib/date.js',
                    'js/lib/jquery-file-uploader.js',
                    'js/lib/jquery-singledoubleclick.js',
                    'js/lib/ZeroClipboard.js',
                    'js/lib/knockout-3.3.0.js',
                    'js/lib/knockout.validation.js',

                    'dist/js/<%= pkg.name %>.js',
                ],
                dest: 'dist/js/<%= pkg.name %>.full.js'
            },
            css: {
                src: [
                    'css/libs.css',
                    'css/bootstrap.css',
                    'css/bootstrap-responsive.css',
                    'css/font-awesome3.css',
                    'css/bootstrap-lightbox.css',
                    'css/bootstrap-datetimepicker.min.css',
                    'bower_components/font-awesome/css/font-awesome.css',
                    'css/style.css'
                ],
                dest: 'dist/css/<%= pkg.name %>.css'
            }
        },

        uglify: {
            kloudspeaker: {
                options: {
                    banner: '<%= banner %>',
                    report: 'min'
                },
                files: [{
                    src: 'dist/js/kloudspeaker.js',
                    dest: 'dist/js/kloudspeaker.min.js'
                }, {
                    src: 'dist/js/kloudspeaker.full.js',
                    dest: 'dist/js/kloudspeaker.full.min.js'
                }]
            }
        },

        cssmin: {
            minify: {
                options: {
                    keepSpecialComments: '*',
                    noAdvanced: true, // turn advanced optimizations off until the issue is fixed in clean-css
                    report: 'min',
                    selectorsMergeMode: 'ie8'
                },
                files: {
                    'dist/css/<%= pkg.name %>.min.css': ['dist/css/<%= pkg.name %>.css']
                }
            }
            /*,
      compress: {
        options: {
          keepSpecialComments: '*',
          noAdvanced: true, // turn advanced optimizations off until the issue is fixed in clean-css
          report: 'min',
          selectorsMergeMode: 'ie8'
        },
        src: [
          'dist/css/<%= pkg.name %>.css'
        ],
        dest: 'dist/css/<%= pkg.name %>.min.css'
      }*/
        },

        usebanner: {
            dist: {
                options: {
                    position: 'top',
                    banner: '<%= banner %>'
                },
                files: {
                    src: [
                        'dist/css/<%= pkg.name %>.css',
                        'dist/css/<%= pkg.name %>.min.css'
                    ]
                }
            }
        },

        requirejs: {
            compile: {
                options: {
                    baseUrl: "js",
                    //mainConfigFile: "path/to/config.js",
                    include: ['text',
                        'durandal/system', 'durandal/viewlocator', 'durandal/plugins/widget', 'durandal/composition', //durandal
                        'kloudspeaker/app', 'kloudspeaker/request', 'kloudspeaker/session', 'kloudspeaker/filesystem', 'kloudspeaker/events', 'kloudspeaker/service', 'kloudspeaker/plugins', 'kloudspeaker/features', //ks
                        'kloudspeaker/ui/parsers', 'kloudspeaker/ui/formatters', 'kloudspeaker/ui/views/login', 'kloudspeaker/ui/views/main',
                        'widgets/time-picker/viewmodel', 'text!widgets/time-picker/view.html', 'widgets/config-list/viewmodel', 'text!widgets/config-list/view.html', //widgets
                        'kloudspeaker/config/system', 'kloudspeaker/config/user/addedit',
                        'kloudspeaker/ui/uploader', 'kloudspeaker/ui/dropbox', 'kloudspeaker/ui/clipboard', 'kloudspeaker/plugins/core', 'kloudspeaker/plugins/permissions' //kloudspeaker plugins
                    ],
                    out: "out/modules.js",
                    paths: {
                        'jquery': 'empty:',
                        'knockout': 'empty:',
                        'durandal': 'durandal/js/',
                        'text': 'requirejs-text/text',
                        'kloudspeaker/instance': 'empty:',
                        'kloudspeaker/settings': 'empty:',
                        //'kloudspeaker/session': 'empty:',
                        //'kloudspeaker/filesystem': 'empty:',
                        //'kloudspeaker/events': 'empty:',
                        //'kloudspeaker/request': 'empty:',
                        //'kloudspeaker/service': 'empty:',
                        //'kloudspeaker/plugins': 'empty:',
                        //'kloudspeaker/features': 'empty:',
                        //'kloudspeaker/dom': 'empty:',
                        //'kloudspeaker/utils': 'empty:',
                        'kloudspeaker/ui/texts': 'empty:',
                        'kloudspeaker/ui/views': 'empty:',
                        'kloudspeaker/ui/views/login': 'kloudspeaker/ui/views/login',   //override
                        'kloudspeaker/ui/views/main': 'kloudspeaker/ui/views/main',   //override
                        //'kloudspeaker/ui/formatters': 'empty:',
                        //'kloudspeaker/ui/controls': 'empty:',
                        //'kloudspeaker/ui/dialogs': 'empty:',
                        //'kloudspeaker/ui': 'empty:',
                        //'kloudspeaker/ui/dropbox' : 'kloudspeaker/ui/dropbox',   //override "empty" ui
                        //'kloudspeaker/ui/dnd': 'empty:',
                        //'kloudspeaker/ui/uploader': 'empty:',
                        //'kloudspeaker/ui/clipboard': 'empty:'
                    }
                }
            }
        },

        copy: {
            css: {
                expand: true,
                src: ['css/images/**'],
                dest: 'dist/'
            },
            fonts: {
                expand: true,
                cwd: 'fonts',
                src: ['*'],
                dest: 'dist/fonts'
            },
            fa: {
                expand: true,
                cwd: 'bower_components/font-awesome/fonts',
                src: ['*'],
                dest: 'dist/fonts'
            },
            js: {
                expand: true,
                src: ['js/lib/*', 'templates/**', 'localization/**'],
                dest: 'dist/'
            },
            backend: {
                expand: true,
                src: [
                    'backend/**',
                    '!backend/dav/**',
                    '!backend/configuration.php',
                    '!backend/*.db',
                    '!backend/plugin/S3/**',
                    '!backend/plugin/FileViewerEditor/viewers/FlowPlayer/**',
                    '!backend/plugin/FileViewerEditor/viewers/JPlayer/**',
                    '!backend/plugin/FileViewerEditor/viewers/TextFile/**',
                    '!backend/plugin/FileViewerEditor/viewers/FlexPaper/**',
                    '!backend/plugin/FileViewerEditor/editors/CKEditor/**'
                ],
                dest: 'dist/'
            },
            dist: {
                files: [{
                    src: 'backend/example/example_index.html',
                    dest: 'dist/index.html'
                }]
            },
            dist_ver: {
                src: 'backend/include/Version.info.php',
                dest: 'dist/backend/include/Version.info.php',
                options: {
                    process: function(content, srcpath) {
                        return "<?php $VERSION=\"" + pkg.version + "\"; $REVISION=" + pkg.revision + "; ?>";
                    }
                }
            },
            dav: {
                files: [{
                    expand: true,
                    cwd: 'backend/',
                    src: 'dav/**',
                    dest: 'dist/'
                }, {
                    expand: true,
                    cwd: 'backend/',
                    src: 'dav/.htaccess',
                    dest: 'dist/'
                }]
            }
        },

        compress: {
            dist: {
                options: {
                    archive: 'dist/<%= pkg.name %>_<%= pkg.version %>.zip'
                },
                files: [{
                    expand: true,
                    cwd: 'dist/',
                    src: ['**', '!<%= pkg.name %>_<%= pkg.version %>.zip'],
                    dest: 'kloudspeaker/'
                }]
            },
            dav: {
                options: {
                    archive: 'dist/kloudspeaker_webdav.zip'
                },
                files: [{
                    expand: true,
                    cwd: 'dist/dav/',
                    src: ['**', '.htaccess'],
                    dest: 'dav/'
                }]
            }
        },

        qunit: {
            options: {
                inject: 'js/tests/unit/phantom.js'
            },
            files: 'js/tests/*.html'
        },

        phpunit: {
            classes: {
                dir: 'backend/test/'
            },
            options: {
                bin: 'vendor/bin/phpunit',
                //bootstrap: 'tests/php/phpunit.php',
                colors: true
            }
        }

    });


    // These plugins provide necessary tasks.
    require('load-grunt-tasks')(grunt, {
        scope: 'devDependencies'
    });

    grunt.registerTask('test', ['jshint', 'jscs', 'qunit', 'phpunit']);

    // JS distribution task.
    grunt.registerTask('dist-js', ['jshint', 'concat', 'uglify', 'copy:js']);

    // CSS distribution task.
    grunt.registerTask('dist-css', ['concat:css', 'cssmin', 'usebanner', 'copy:css', 'copy:fonts', 'copy:fa']);

    // JS distribution task.
    grunt.registerTask('dist-backend', ['copy:backend']);

    // WebDAV
    grunt.registerTask('dist-dav', ['clean', 'copy:dav', 'compress:dav']);

    // Full distribution task.
    grunt.registerTask('dist', ['clean', 'requirejs:compile', 'dist-js', 'dist-css', 'dist-backend', 'copy:dist', 'copy:dist_ver', 'compress:dist']);

    // Default task.
    grunt.registerTask('default', ['dist']);

    // Version numbering task.
    // grunt change-version-number --oldver=A.B.C --newver=X.Y.Z
    // This can be overzealous, so its changes should always be manually reviewed!
    //grunt.registerTask('change-version-number', 'sed');
};
