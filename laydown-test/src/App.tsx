import MarkdownDisplay from 'laydown-react';



const md = `

# Test Markdown

This is a test string of Markdown Parsing.

<!-- heading: align-center -->
<!-- heading: use-hash#test-hash -->
# Align Center Heading

|Table|Heading|
|:----|------:|
|Table|Content|


<!-- layout: start#h4 -->

## Layout 1

test 1

## Layout 2 

test 2

<!-- layout: disp -->

test 3 without title

## Layout 4

test 4

Gan Si Huang Xu Dong!


`;


function App() {

  return (
    <div className="App">
      <MarkdownDisplay>
        { md }
      </MarkdownDisplay>
    </div>
  );
}

export default App;
