var globby = require('globby'),
    fs     = require('fs')

/** 
 * Walc class definition
 *
 */
var Walc = function (options) {

  // default values
  var path           = null,
      actions        = ['remove', 'comment', 'ignore'],
      defaultAction  = 'ignore',
      methods        = {'console': defaultAction, 'alert': defaultAction},
      consoleAction  = defaultAction,
      alertAction    = defaultAction,
      action

  // override default values if exists in options objects 
  if (typeof options === 'object') {
    path = (typeof options.path === 'string' || typeof options.path === 'object') ? options.path : path

    if (typeof options.methods === 'object') {

      for (var i = 0, arr = Object.keys(methods), len = arr.length; i < len; i++) {
        action = arr[i]
        methods[action] = (typeof options.methods[action] === 'string' && actions.indexOf(options.methods[action]) >= 0 ) ? options.methods[action] : defaultAction
      }

    }

  }
  else if (typeof options === 'string') {
    path = options
  }

  if (path === null) {
    console.log('Walc : `path` is not defined')
    process.exit(0)
  }

  /**
   * static params
   * reachable via `this.getParam(param)`
   */
  var params = {

    'pathSrc': path,

    'pathDest': 'dest/',

    'actions': actions,

    'defaultAction': defaultAction,
    
    // method : action
    'methods': methods,

    'quotesRegex': /((\"|\')(.+?)(\"|\'))/gi,

    'mainRegex': /(((\/\/\s*)?(\/\*\s*)?)+?)(((console)\.([a-z]+)|(alert))\((.+?)\);?)(((\s*\*\/)?)+?)/gi,

    'files': []

  }

  // setter to push path into private var `files`
  this.setFiles = function(files) {
    return params['files'] = files || []
  }

  // getter to parse `params` private object
  this.getParam = function(name) {
    return params[name]
  }

  // create destination directory if not exists
  try{ fs.mkdirSync( params.pathDest ) } catch (err) {  }

}


Walc.prototype = {

  run: function() {
    var walc   = this,
        mainRegex   = walc.getParam('mainRegex'),
        methods     = walc.getParam('methods'),
        actions     = walc.getParam('actions'),
        files       = globby.sync( walc.getParam('pathSrc') ),
        comments    = false,
        file,
        segments,
        filename,
        data,
        currentAction,
        is

    for (var i = 0, len = files.length; i < len; i++) {
      
      // path file to read
      file = files[i]

      // split path file to get the file name
      segments = file.split('/')
      filename = segments[segments.length-1]

      // read file
      data = fs.readFileSync(file, {encoding: 'utf8'})

      // transform ')' to '&#40;' => cause to mainRegex match, try to fix it...
      data = walc.quotes(data)
      
      // replace 'console' and 'alert' by comment or remove. Ignore if already comment
      data = data.replace(mainRegex, function (match, startComments, $2, $3, $4, stringToAction, isAlert, isConsole, typeConsole, $9, brackets, endComments, $12, offset, string) {
        
        comments       = (startComments === '') ? false : true
        if (comments) return startComments + stringToAction + endComments

        is             = isConsole || isAlert
        currentAction  = (typeof is === 'string' && actions.indexOf(methods[is]) >= 0) ? methods[is] : walc.getParam('defaultAction')

        switch(currentAction) {
          case 'remove' :
            return '';
            break;
          case 'comment' :
            return '/* ' + stringToAction + ' */';
            break;
          default:
            return stringToAction
            break;
        }

      })

      // transform '&#40;' to ')' => cause to mainRegex match, try to fix it...
      data = walc.quotes(data, true)

      // and write the new content to path dest
      fs.writeFileSync(walc.getParam('pathDest') + filename, data)
    }
  },

  quotes: function(data, reverse) {

    var quotesRegex  = this.getParam('quotesRegex'),
        matchReplace = [')', '&#40;']

    if (reverse === true)
      matchReplace.reverse()

    var reg          = new RegExp('\\' + matchReplace[0], 'i')

    return data.replace(quotesRegex, function (match, $1, typeQuote, toCheck, $4, offset, string) {

      if (toCheck.match(reg))
        toCheck = toCheck.replace(matchReplace[0], matchReplace[1])
      
      return typeQuote + toCheck + typeQuote

    })

  }

} 


/**
 * Module exports
 *
 */
module.exports = Walc