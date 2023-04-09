import React from 'react';

import { HtmlRenderingOptions, Node } from 'commonmark';

import { CodeBlock, CodeSpan } from '../nodes/CodeBlock';
import { deepFilterHtmlNode, handleHtmlElementLink, potentiallyUnsafe, replaceChildren } from './html-renderer';
import MathBlock, { MathSpan } from '../nodes/MathBlock';
import parse from 'html-react-parser';

import { ExtendedNodeType, HierarchicalNavNode, LayoutParams, LayoutSlotParams } from 'laydown';
import { TableCellContent } from 'laydown';
import { HtmlParagraphDefinition } from 'laydown';
import { TemplateParams } from 'laydown';
import { LaydownRenderingContext, LaydownRenderer, RenderFunction } from 'laydown';

import { deepFilterStringChildren } from '../base/common';
import linkIcon from '../assets/icons/link.svg';
import styles from './md-styles.module.css';
import { ReactLayout, ReactLayoutSlot } from '../nodes/LayoutNode';

type ENode = Node<ExtendedNodeType>;
type RenderedNode = React.ReactElement;


type RendererRecord = Record<ExtendedNodeType, RenderFunction<RenderedNode>>;


// title anchor

type TitleAnchorProps = {
  to: string,
  id: string,
  noClick?: boolean,
};

const TitleAnchor = (props: TitleAnchorProps) => {
  const { to, id, noClick } = props;

  return <div className={styles['title-anchor']}>
    <div>

      <span className={styles['title-id']} id={id}></span>
      {
        !noClick &&
        <a href={to}>
          <img src={linkIcon} />
        </a>
      }
    </div>

  </div>;
};

// types

export type TemplateNodeProps = {
  params: TemplateParams,
  options: ReactRenderingOptions,
};

export type TemplateNode = (props: TemplateNodeProps) => RenderedNode;

const DefaultTemplateNode: TemplateNode = ({ params }: TemplateNodeProps) => {
  return <>
    <span>Template Node</span>
    <br />
    <span>{JSON.stringify(params)}</span>
  </>;
};

export type ReactRenderingOptions = HtmlRenderingOptions & {
  parseLink?: (raw: string) => string;
  templateHandler?: TemplateNode;
};


// renderers

export class LaydownNodeRenderer implements RendererRecord {

  readonly options: ReactRenderingOptions;

  constructor(options?: ReactRenderingOptions) {
    this.options = Object.assign({
      softbreak: '\n',
    }, options);
  }

  // renderers

  text(_context: LaydownRenderingContext, node: ENode) {
    return <>{node.literal}</>;
  }

  softbreak() {
    return <></>;
  }

  linebreak() {
    return <br />;
  }

  link(_context: LaydownRenderingContext, node: ENode, children: RenderedNode[]) {
    let href: string | undefined = undefined;
    let title: string | undefined = undefined;
    if (!(this.options.safe && potentiallyUnsafe(node.destination))) {
      href = node.destination ?? undefined;
    }
    if (node.title) {
      title = node.title;
    }
    return <a href={href} title={title}>{children}</a>;
  }

  // TODO escape XML ...?
  image(_context: LaydownRenderingContext, node: ENode) {
    if (this.options.safe && potentiallyUnsafe(node.destination)) {
      return <span>[ERROR: POTENTIALLY UNSAFE LINK OMITTED]</span>;
    } else {
      const src = this.options.esc?.(node.destination ?? '') ?? node.destination ?? '';
      return <img src={this.options.parseLink?.(src) ?? src} />;
    }
  }

  emph(_context: LaydownRenderingContext, _node: ENode, children: RenderedNode[]) {
    return <em>{children}</em>;
  }

  strong(_context: LaydownRenderingContext, _node: ENode, children: RenderedNode[]) {
    return <strong>{children}</strong>;
  }

  html_inline(_context: LaydownRenderingContext, node: ENode) {
    if (this.options.safe)
      return <>[ERROR: RAW HTML OMITTED]</>;
    return <>{deepFilterHtmlNode(parse(node.literal ?? ''))}</>;
  }

  html_block(context: LaydownRenderingContext, node: ENode) {
    return this.html_inline(context, node);
  }

  code(_context: LaydownRenderingContext, node: ENode) {
    return <CodeSpan>{node.literal}</CodeSpan>;
  }

  code_block(_context: LaydownRenderingContext, node: ENode) {
    let lang: string | undefined;
    const info_words = node.info ? node.info.split(/\s+/) : [];
    if (info_words.length > 0 && info_words[0].length > 0) {
      lang = this.options.esc?.(info_words[0]) ?? info_words[0];
    }
    if (lang === 'math' || lang === 'latex')
      return <MathBlock>{node.literal}</MathBlock>;
    return <CodeBlock lang={lang}>{node.literal}</CodeBlock>;
  }



  paragraph(_context: LaydownRenderingContext, node: ENode, children: RenderedNode[]) {
    const grandparent = node.parent?.parent;
    if (grandparent && grandparent.type === 'list') {
      if (grandparent.listTight) {
        return <>{children}</>;
      }
    }
    return <p>{children}</p>;
  }

  block_quote(_context: LaydownRenderingContext, _node: ENode, children: RenderedNode[]) {
    return <blockquote>{children}</blockquote>;
  }

  item(_context: LaydownRenderingContext, _node: ENode, children: RenderedNode[]) {
    return <li>{children}</li>;
  }

  list(_context: LaydownRenderingContext, node: ENode, children: RenderedNode[]) {
    const start = node.listStart;
    const _start = (start !== undefined && start !== 1) ? start : undefined;
    return node.listType === 'bullet' ?
      (<ul>{children}</ul>) :
      (<ol start={_start}>{children}</ol>);
  }

  heading(context: LaydownRenderingContext, node: ENode, children: RenderedNode[]) {
    const HeadingTag = `h${node.level}` as keyof JSX.IntrinsicElements;
    const href = context.navHref ?? '#null';


    const shouldAlignCenter =
      (context.macroStore.check(HeadingTag, 'align-center') ??
        context.macroStore.check('heading', 'align-center')) !== undefined;


    return <HeadingTag style={
      shouldAlignCenter ?
        { textAlign: 'center' } :
        undefined
    }
    >
      <TitleAnchor to={href} id={href.replace(/^#?/, '')} key='anchor' noClick={
        !!(context.macroStore.check(HeadingTag, 'no-link') ??
          context.macroStore.check('heading', 'no-link'))
      } />
      {children}

    </HeadingTag>;
  }

  thematic_break() {
    return <hr />;
  }


  document(_context: LaydownRenderingContext, _node: ENode, children: RenderedNode[]) {
    return <>{children}</>;
  }

  math_block(_context: LaydownRenderingContext, node: ENode) {
    return <MathBlock>{node.literal}</MathBlock>;
  }

  math_inline(_context: LaydownRenderingContext, node: ENode) {
    return <MathSpan>{node.literal}</MathSpan>;
  }

  table(_context: LaydownRenderingContext, _node: ENode, children: RenderedNode[]) {
    return <table>
      {React.Children.toArray(children)[0]}
      <tbody>
        {React.Children.toArray(children).slice(1)}
      </tbody>
    </table>;
  }

  table_head(_context: LaydownRenderingContext, _node: ENode, children: RenderedNode[]) {
    return <thead><tr>{children}</tr></thead>;
  }

  table_row(_context: LaydownRenderingContext, _node: ENode, children: RenderedNode[]) {
    return <tr>{children}</tr>;
  }

  table_cell(_context: LaydownRenderingContext, node: ENode, children: RenderedNode[]) {
    const content = (node.customData as TableCellContent);
    const CellTag = (content.isHeader ? 'th' : 'td') as keyof JSX.IntrinsicElements;
    return <CellTag align={content.align}>{children}</CellTag>;
  }

  html_paragraph(_context: LaydownRenderingContext, node: ENode, children: RenderedNode[]) {
    const { startTag, endTag, tagName } = node.customData as HtmlParagraphDefinition;
    const isValidNode = startTag !== undefined || tagName !== undefined;
    if (!isValidNode)
      return <>{children}</>;
    const htmlString = (startTag ?? '') + (endTag ?? '');
    const htmlBlock = deepFilterHtmlNode(parse(htmlString !== '' ? htmlString : (
      (tagName ?? '') !== '' ? `<${tagName}>` : ''
    )));
    if (typeof htmlBlock !== 'string') {
      if (htmlBlock instanceof Array) {
        if (htmlBlock.length === 0)
          return <>{children}</>;
        htmlBlock[0] = replaceChildren(htmlBlock[0], children);
        return <>{htmlBlock.map(x => handleHtmlElementLink(x, this.options.parseLink))}</>;
      }
      else
        return handleHtmlElementLink(
          replaceChildren(htmlBlock, children),
          this.options.parseLink
        );
    }
    return <>{children}</>;
  }

  html_paragraph_text(context: LaydownRenderingContext, node: ENode) {
    return this.text(context, node);
  }

  template(_context: LaydownRenderingContext, node: ENode) {
    const template = node.customData as TemplateParams;
    const TemplateHandler = this.options.templateHandler ?? DefaultTemplateNode;
    if (template !== undefined)
      return <TemplateHandler params={template} options={this.options} />;
    return <></>;
  }

  emoji(_context: LaydownRenderingContext, node: ENode) {
    const emoji = node.literal ?? '';
    /*
    if (emoji.startsWith('fontawesome')) {
      return <FontAwesomeIcon icon={regular(emoji.replace(/^fontawesome[-_], '') as IconName)} />;
    }
    */
    return <>{emoji}</>;
  }

}

const resetChildrenKey = (c: RenderedNode[]) => c.map((n, i) => (<React.Fragment key={`node_${i}`}>{n}</React.Fragment>));

export class LaydownReactRenderer extends LaydownRenderer<RenderedNode> {

  private readonly inner: LaydownNodeRenderer;

  constructor(options?: ReactRenderingOptions) {
    super();
    this.inner = new LaydownNodeRenderer(options);
  }

  getChildren(): RenderedNode[] | undefined {
    const children = super.getChildren();
    return resetChildrenKey(children ?? []);
  }

  getRenderer(type: ExtendedNodeType): RenderFunction<RenderedNode> {
    const ret = this.inner[type as unknown as keyof LaydownNodeRenderer] as RenderFunction<RenderedNode>;
    if (ret == undefined)
      return (() => <>[WARNING: Type {type}'s renderer not found]</>);
    return ret.bind(this.inner);
  }

  stringify(node: Node<ExtendedNodeType>, children: RenderedNode[]): string {
    if (node.type === 'html_block' || node.type === 'html_inline')
      return node.literal ?? '';
    else if (node.type === 'heading' || node.type === 'paragraph')
      return deepFilterStringChildren(<>{children}</>);
    throw new Error('Method not implemented.');
  }

  result(): { nav: HierarchicalNavNode | undefined; render: RenderedNode[] | undefined; } {
    const { nav, render } = super.result();
    return {
      nav,
      render: resetChildrenKey(render ?? []),
    };
  }  
  
  renderLayout(params: LayoutParams, children: RenderedNode[]): RenderedNode {
    return <ReactLayout {...params}>
      { resetChildrenKey(children) }
    </ReactLayout>;
  }

  renderLayoutSlot(params: LayoutSlotParams, children: RenderedNode[]): RenderedNode {
    return <ReactLayoutSlot {...params}>
      { resetChildrenKey(children) }
    </ReactLayoutSlot>;
  }


}

export default LaydownReactRenderer;