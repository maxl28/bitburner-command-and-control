// Based on https://github.com/danielyxie/bitburner/blob/master/src/data/codingcontracttypes.ts
export const codingContractTypesMetadata = [
  {
    name: 'Find Largest Prime Factor',
    solver: function (data) {
      var fac = 2
      var n = data
      while (n > (fac - 1) * (fac - 1)) {
        while (n % fac === 0) {
          n = Math.round(n / fac)
        }
        ++fac
      }
      return n === 1 ? fac - 1 : n
    },
  },
  {
    name: 'Subarray with Maximum Sum',
    solver: function (data) {
      var nums = data.slice()
      for (var i = 1; i < nums.length; i++) {
        nums[i] = Math.max(nums[i], nums[i] + nums[i - 1])
      }
      return Math.max.apply(Math, nums)
    },
  },
  {
    name: 'Total Ways to Sum',
    solver: function (data) {
      var ways = [1]
      ways.length = data + 1
      ways.fill(0, 1)
      for (var i = 1; i < data; ++i) {
        for (var j = i; j <= data; ++j) {
          ways[j] += ways[j - i]
        }
      }
      return ways[data]
    },
  },
  {
    name: 'Spiralize Matrix',
    solver: function (data) {
      var spiral = []
      var m = data.length
      var n = data[0].length
      var u = 0
      var d = m - 1
      var l = 0
      var r = n - 1
      var k = 0
      while (true) {
        // Up
        for (var col = l; col <= r; col++) {
          spiral[k] = data[u][col]
          ++k
        }
        if (++u > d) {
          break
        }
        // Right
        for (var row = u; row <= d; row++) {
          spiral[k] = data[row][r]
          ++k
        }
        if (--r < l) {
          break
        }
        // Down
        for (var col = r; col >= l; col--) {
          spiral[k] = data[d][col]
          ++k
        }
        if (--d < u) {
          break
        }
        // Left
        for (var row = d; row >= u; row--) {
          spiral[k] = data[row][l]
          ++k
        }
        if (++l > r) {
          break
        }
      }

      return spiral
    },
  },
  {
    name: 'Array Jumping Game',
    solver: function (data) {
      var n = data.length
      var i = 0
      for (var reach = 0; i < n && i <= reach; ++i) {
        reach = Math.max(i + data[i], reach)
      }
      var solution = i === n
      return solution ? 1 : 0
    },
  },
  {
    name: 'Merge Overlapping Intervals',
    solver: function (data) {
      var intervals = data.slice()
      intervals.sort(function (a, b) {
        return a[0] - b[0]
      })
      var result = []
      var start = intervals[0][0]
      var end = intervals[0][1]
      for (var _i = 0, intervals_1 = intervals; _i < intervals_1.length; _i++) {
        var interval = intervals_1[_i]
        if (interval[0] <= end) {
          end = Math.max(end, interval[1])
        } else {
          result.push([start, end])
          start = interval[0]
          end = interval[1]
        }
      }
      result.push([start, end])
      var sanitizedResult = convert2DArrayToString(result)
      return sanitizedResult
    },
  },
  {
    name: 'Generate IP Addresses',
    solver: function (data, ans) {
      var ret = []
      for (var a = 1; a <= 3; ++a) {
        for (var b = 1; b <= 3; ++b) {
          for (var c = 1; c <= 3; ++c) {
            for (var d = 1; d <= 3; ++d) {
              if (a + b + c + d === data.length) {
                var A = parseInt(data.substring(0, a), 10)
                var B = parseInt(data.substring(a, a + b), 10)
                var C = parseInt(data.substring(a + b, a + b + c), 10)
                var D = parseInt(data.substring(a + b + c, a + b + c + d), 10)
                if (A <= 255 && B <= 255 && C <= 255 && D <= 255) {
                  var ip = [A.toString(), '.', B.toString(), '.', C.toString(), '.', D.toString()].join('')
                  if (ip.length === data.length + 3) {
                    ret.push(ip)
                  }
                }
              }
            }
          }
        }
      }
      return ret
    },
  },
  {
    name: 'Algorithmic Stock Trader I',
    solver: function (data) {
      var maxCur = 0
      var maxSoFar = 0
      for (var i = 1; i < data.length; ++i) {
        maxCur = Math.max(0, (maxCur += data[i] - data[i - 1]))
        maxSoFar = Math.max(maxCur, maxSoFar)
      }
      return maxSoFar.toString()
    },
  },
  {
    name: 'Algorithmic Stock Trader II',
    solver: function (data) {
      var profit = 0
      for (var p = 1; p < data.length; ++p) {
        profit += Math.max(data[p] - data[p - 1], 0)
      }
      return profit.toString()
    },
  },
  {
    name: 'Algorithmic Stock Trader III',
    solver: function (data) {
      var hold1 = Number.MIN_SAFE_INTEGER
      var hold2 = Number.MIN_SAFE_INTEGER
      var release1 = 0
      var release2 = 0
      for (var _i = 0, data_1 = data; _i < data_1.length; _i++) {
        var price = data_1[_i]
        release2 = Math.max(release2, hold2 + price)
        hold2 = Math.max(hold2, release1 - price)
        release1 = Math.max(release1, hold1 + price)
        hold1 = Math.max(hold1, price * -1)
      }
      return release2.toString()
    },
  },
  {
    name: 'Algorithmic Stock Trader IV',
    solver: function (data) {
      var k = data[0]
      var prices = data[1]
      var len = prices.length
      if (len < 2) {
        return 0
      }
      if (k > len / 2) {
        var res = 0
        for (var i = 1; i < len; ++i) {
          res += Math.max(prices[i] - prices[i - 1], 0)
        }
        return res
      }
      var hold = []
      var rele = []
      hold.length = k + 1
      rele.length = k + 1
      for (var i = 0; i <= k; ++i) {
        hold[i] = Number.MIN_SAFE_INTEGER
        rele[i] = 0
      }
      var cur
      for (var i = 0; i < len; ++i) {
        cur = prices[i]
        for (var j = k; j > 0; --j) {
          rele[j] = Math.max(rele[j], hold[j] + cur)
          hold[j] = Math.max(hold[j], rele[j - 1] - cur)
        }
      }
      return rele[k]
    },
  },
  {
    name: 'Minimum Path Sum in a Triangle',
    solver: function (data) {
      var n = data.length
      var dp = data[n - 1].slice()
      for (var i = n - 2; i > -1; --i) {
        for (var j = 0; j < data[i].length; ++j) {
          dp[j] = Math.min(dp[j], dp[j + 1]) + data[i][j]
        }
      }
      return dp[0]
    },
  },
  {
    name: 'Unique Paths in a Grid I',
    solver: function (data) {
      var n = data[0] // Number of rows
      var m = data[1] // Number of columns
      var currentRow = []
      currentRow.length = n
      for (var i = 0; i < n; i++) {
        currentRow[i] = 1
      }
      for (var row = 1; row < m; row++) {
        for (var i = 1; i < n; i++) {
          currentRow[i] += currentRow[i - 1]
        }
      }
      return currentRow[n - 1]
    },
  },
  {
    name: 'Unique Paths in a Grid II',
    solver: function (data) {
      var obstacleGrid = []
      obstacleGrid.length = data.length
      for (var i = 0; i < obstacleGrid.length; ++i) {
        obstacleGrid[i] = data[i].slice()
      }
      for (var i = 0; i < obstacleGrid.length; i++) {
        for (var j = 0; j < obstacleGrid[0].length; j++) {
          if (obstacleGrid[i][j] == 1) {
            obstacleGrid[i][j] = 0
          } else if (i == 0 && j == 0) {
            obstacleGrid[0][0] = 1
          } else {
            obstacleGrid[i][j] = (i > 0 ? obstacleGrid[i - 1][j] : 0) + (j > 0 ? obstacleGrid[i][j - 1] : 0)
          }
        }
      }
      return obstacleGrid[obstacleGrid.length - 1][obstacleGrid[0].length - 1]
    },
  },
  {
    name: 'Sanitize Parentheses in Expression',
    solver: function (data) {
      var left = 0
      var right = 0
      var res = []
      for (var i = 0; i < data.length; ++i) {
        if (data[i] === '(') {
          ++left
        } else if (data[i] === ')') {
          left > 0 ? --left : ++right
        }
      }
      function dfs(pair, index, left, right, s, solution, res) {
        if (s.length === index) {
          if (left === 0 && right === 0 && pair === 0) {
            for (var i = 0; i < res.length; i++) {
              if (res[i] === solution) {
                return
              }
            }
            res.push(solution)
          }
          return
        }
        if (s[index] === '(') {
          if (left > 0) {
            dfs(pair, index + 1, left - 1, right, s, solution, res)
          }
          dfs(pair + 1, index + 1, left, right, s, solution + s[index], res)
        } else if (s[index] === ')') {
          if (right > 0) dfs(pair, index + 1, left, right - 1, s, solution, res)
          if (pair > 0) dfs(pair - 1, index + 1, left, right, s, solution + s[index], res)
        } else {
          dfs(pair, index + 1, left, right, s, solution + s[index], res)
        }
      }
      dfs(0, 0, left, right, data, '', res)

      return res
    },
  },
  {
    name: 'Find All Valid Math Expressions',
    solver: function (data) {
      var num = data[0]
      var target = data[1]
      function helper(res, path, num, target, pos, evaluated, multed) {
        if (pos === num.length) {
          if (target === evaluated) {
            res.push(path)
          }
          return
        }
        for (var i = pos; i < num.length; ++i) {
          if (i != pos && num[pos] == '0') {
            break
          }
          var cur = parseInt(num.substring(pos, i + 1))
          if (pos === 0) {
            helper(res, path + cur, num, target, i + 1, cur, cur)
          } else {
            helper(res, path + '+' + cur, num, target, i + 1, evaluated + cur, cur)
            helper(res, path + '-' + cur, num, target, i + 1, evaluated - cur, -cur)
            helper(res, path + '*' + cur, num, target, i + 1, evaluated - multed + multed * cur, multed * cur)
          }
        }
      }

      if (num == null || num.length === 0) {
        return []
      }
      var result = []
      helper(result, '', num, target, 0, 0, 0)
      return result
    },
  },
  {
    name: 'Compression II: LZ Decompression',
    solver: function(data) {
      let decodedMsg = ''
      let counter = data.length
      let typeI = true

      // Digest chunks
      while (data.length > 1 && counter > 0) {
        counter--

        // Determin length L of chunk.
        let L = parseInt( data[0] )

        // We have an empty chunk
        if (L === 0) {
          // Remove chunk
          data = data.substring(1)

          typeI = !typeI

          // proceed to next chunk
          continue
        }

        // Type II chunk, reference to earlier Type I
        if ( data[1].match(/\d/) && (!typeI || (data.length == 2 && L > 1))) {
          // Determine character reference X
          let X = parseInt( data[1], 10 )

          // Translate the reference index to match our decoded string so far.
          let refIndex = decodedMsg.length - X

          // Remember data piece we want to repeat
          let chunk = decodedMsg.substring( refIndex, refIndex + X )

          // Fill in chunk until length satisfied
          while (L > 0) {
            // Add referenced char chain to result
            decodedMsg += chunk.substring(0, Math.min(L, X))

            // Adjust remaining length
            L -= X
          }

          // Modify L to crop the correct number of chars from remaining data
          L = 1
        }
        // Type 1 chunk, containing valid ASCII symbols
        else {
          // Add L chars to result
          decodedMsg += data.substring(1, 1+L)
        }

        // Remove processed chars from encoded data
        data = data.substring(1+L)

        typeI = !typeI
      }

      return decodedMsg
    }
  },
  {
    name: 'Compression III: LZ Compression @@@',
    solver: function solver(data) {
      let encodedMsg = ''
      let processedData = ''
      let counter = 0

      do {
        // Prepare our dictionary, in case we need it.
        let dict = processedData.substring(
          Math.max(0, processedData.length-9),
          processedData.length
        )

        let chunk = '',
          dictIndex = -1
        
        console.log('---CHUNK---')
        for ( let i = 1; i < 10; i++ ) {
          // Terminate on End-Of-Message reached
          if ( i > data.length ) break

          // Split of a chunk from original message
          chunk = data.substring(0, i)

          // Can we use a reference AND do we shorten the message in case we skip a Type I?
          if ( dict.includes(chunk) && (counter % 2 > 0 || chunk.length > 2) && !dict.includes(chunk + data[i]) ) {
            // Search our dictionary for reference
            dictIndex = dict.lastIndexOf(chunk)

            console.log('REF: ', chunk, dictIndex)

            break
          }

          // Do we have a non-expandable repeating chunk ahead?x
          if ( data.substring(i, i+9).includes(chunk) && !data.substring(i+1, i+9).includes(chunk + data[i])) {
            console.log('REP: ', chunk, i, data.substring(i).indexOf(chunk))

              // Expand chunk to max or until repeat.
              chunk = data.substring(0, Math.min(9, i + data.substring(i).indexOf(chunk)))

              break
          }
        }

        // Fill Type II
        if ( dictIndex > -1 ) {
          console.log('TYPE: II')
          // Do we need to use a filler chunk?
          if ( counter % 2 == 0) {
            console.log('Append Filler')
            encodedMsg += '0'
            counter++
          }

          // Prepare digit counter, remember, dict overflows to start if L > dict.length
          let L = 0

          // Prepare dict for overflow-repeat behaviour
          let localDict = dict.substring(dictIndex)

          // Translate reference index
          let X = Math.abs(dict.length - dictIndex)

          while ( L < 10 ) {
            // Can we still repeat the dict?
            if (localDict[ dictIndex + L % localDict.length ] != data[L]) break

            // Increase digit repeat count
            L++
          }

          // Add result to encoded message.
          encodedMsg += `${L}${X}`

          // Add to progress
          processedData += data.substring(0, L)

          // Shave away processed Data
          data = data.substring(L)

          console.log('L: ', L)
          console.log('X: ', X)
        } 
        // Use Type I
        else {
          console.log('TYPE: I')
          // Do we need to use a filler chunk?
          if ( counter % 2 > 0) {
            console.log('Append Filler')
            encodedMsg += '0'
            counter++
          }

          console.log('D: ', chunk)

          // Add chunk to encoded result
          encodedMsg += `${chunk.length}${chunk}`

          // Add chunk to progress
          processedData += chunk

          // Remove chunk from remaining data
          data = data.substring(chunk.length)
        }

        counter++

        console.log('---END---')
      } while (data.length > 0)

      return encodedMsg
    }
  },
  {
    name: 'Array Jumping Game II',
    solver: function solver(data) {
      
      // Try and find the minimum number of steps trough the list
      let tryStep = (lst, i = 0, path = []) => {
        let steps = []

        // Return on Ping-Pong behaviour.
        if ( path.length > lst.length * 3) return 0

        // Return on END reached.
        if ( i == lst.length - 1) {
          return path.length
        }

        // Check every path in given MAX jump range we haven't visited yet.
        for ( let a = 1; a <= lst[i]; a++ ) {
          // Can move right?
          if ( i + a < lst.length ) {
            // Have we been here before?
            if (!path.includes(i + a)) {
              // Add possible step to list.
              steps.push( tryStep(lst, i + a, [...path, i]) )
            }
          }
        }

        // Strip dead-ends from search results
        steps = steps.filter(v => v > 0)

        // Nowhere to go, signal dead end.
        if ( steps.length == 0 ) return 0

        // Return shortest possible path
        return Math.min(...steps)
      }

      // Return 0 on impossible step length and proper result otherwise.
      return tryStep( data )
    }
  },
  {
    name: 'Compression I: RLE Compression',
    solver: function(data) {
      let encodedMsg = '',
        counter = 0,
        previousChar = data[0]

      for ( let char of data ) {
        // Do we have a char repeat and are under maximum length?
        if ( char == previousChar && counter < 9 ) {
          counter++
        } 
        // If not add what we have to encoded string and prepare env for next 'run'.
        else {
          encodedMsg += `${counter}${previousChar}`

          previousChar = char
          counter = 1
        }
      }

      // Add overhang
      if ( counter < 9 ) encodedMsg += `${counter}${previousChar}`

      return encodedMsg
    }
  },
  // ToDo: fix this one
  {
    name: 'Total Ways to Sum II @@',
    solver: function (data) {
      var ways =  []

      // Go trough every number in list
      for( let x in data[1] ) {
        
        var max = x,
          way = [x]

          // Add consecutive numbers from list
          for( let y in data[1] ) {
            if ( max + y <= data[0] ) {
              max += y
              way.push(y)
            }
          }
        
        // Sort lowest to highest value
        way = way.sort((a, b) => { return a > b })
        
        // Add solution if we don't have it already
        if (max == data[0] && !ways.includes(way)) {
          ways.push(way)
        }
      }

     return ways
    }
  },
  {
    name: 'HammingCodes: Encoded Binary to Integer @@@',
    solver: function(data) {

      let dataBits = [],
        parietyBits = []

      // Sort data and pariety (error correction) bits
      for( let i = 0; i < data.length; i++ ) {
        if( Math.log2(i) % 1 !== 0 ) { dataBits.push(data[i]) }
        else { parietyBits.push(data[i]) }
      }

      // Assume number valid
      return parseInt( dataBits.join(''), 2 )
    } 
  },
  {
    name: 'Shortest Path in a Grid @@@',
    solver: function solver(data) {
      
      // Start in top left corner
      let pos = [0,0],
          path = [],
          blacklist = [],
          cntr = Math.pow(data.length, 2)
      
      do {
        // Decrease overflow counter
        cntr--

        // Set step test preference to following order:
        let steps = [
          [1,0], // Right
          [0,1], // Down
          [0,-1], // Left
          [-1,0], // Up
        ]

        // Assemble array of possible moves in order.
        let validSteps = []
        for( let step of steps ) {
          // Prepare and sanitize check coordinates.
          let i = Math.min(Math.max(0, data.length-1), Math.max(0, pos[0] + step[0])),
              j = Math.min(Math.max(0, data[0].length-1), Math.max(0, pos[1] + step[1]))
          
          // Skip same position checks.
          if (i == pos[0] && j == pos[1]) continue
          
          // Add to possibilities if no obstacle encountered.
          if (data[i][j] != 1) validSteps.push(step)
        }

        // Remove steps from path
        // ToDo: replace .filter() for performance, we only need to check the last path entry for match.
        let filteredSteps = validSteps.filter(s =>
          !path.includes([pos[0] + s[0], pos[1] + s[1]]) && 
          !blacklist.includes([pos[0] + s[0], pos[1] + s[1]]))

        console.log(`STEP[${cntr}]{${pos[0]},${pos[1]}}: `, validSteps, filteredSteps)

        // Check if we have novel path choices.
        if ( filteredSteps.length > 0 ) {
          // Preserve step order, choose first option always.
          pos = [
            pos[0] + filteredSteps[0][0],
            pos[1] + filteredSteps[0][1]
          ]
          path.push(pos)
        } else if ( validSteps.length > 0) {
          // Blacklist current position.
          blacklist.push(pos)

          // Go back one step.
          pos = path[path.length-2]

          // Remove faux-pas from path.
          path.pop()
        } else {
          // No possible steps from here, return impossible.
          break
        }
        
        console.log(`MOVE -> {${pos[0]}, ${pos[1]}}`)

        // If we haven't reached the end yet, keep going.
      } while ( pos != [data.length -1, data[0].length -1] && cntr > 0 )

      console.log('DONE')

      // Prepare empty result.
      let pathString = ''

      // Reset grid pointer.
      pos = [0,0]

      // Translate every step to char.
      for ( let step of path ) {
        switch( [step[0] - pos[0], step[1] + pos[1]] ) {
          case [1,0]:
            pathString += 'U'
            break
          case [0,1]:
              pathString += 'R'
              break
          case [-1,0]:
            pathString += 'D'
            break
          case [0,-1]:
              pathString += 'L'
              break
        }

        pos = step
      }

      // Return empty string if no possible path found, return solution as string otherwise.
      return path[path.length-1] == [data.length-1, data[0].length-1] ? pathString : ''
    }
  },
  {
    name: 'Proper 2-Coloring of a Graph @@@@@@',
    solver: function(data) {

    }
  }
]
// 2 Color Graph
// each cell needs even or 0 number of neigbours 

function convert2DArrayToString(arr) {
    const components = []
    arr.forEach((e) => {
        let s = e.toString();
        s = ["[", s, "]"].join("")
        components.push(s)
    });

    return components.join(",").replace(/\s/g, "")
}