/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/ui/dialog', 'N/currentRecord', 'N/ui/message', 'N/search'],

    function (dialog, currentRecord, message, search) {

        /**
         * Function to be executed after page is initialized.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.mode - The mode in which the record is being accessed (create, copy, or edit)
         *
         * @since 2015.2
         */
        function saveRecord(scriptContext) {
            var rec = scriptContext.currentRecord;

            var lineCount = rec.getLineCount({ sublistId: 'custpage_commission_sublist' });
            var lineCount2 = rec.getLineCount({ sublistId: 'custpage_edit_values_sublist' });

            for (var index = 0; index < lineCount2; index++) {
                var repVendas = rec.getSublistValue({
                    sublistId: 'custpage_edit_values_sublist',
                    fieldId: 'custpage_sales_rep_teste',
                    line: index
                });

                var finalValue = rec.getSublistValue({
                    sublistId: 'custpage_edit_values_sublist',
                    fieldId: 'custpage_final_value',
                    line: index
                });

                if (repVendas && finalValue) {

                    rec.selectNewLine({
                        sublistId: 'custpage_commission_sublist'
                    });

                    rec.setCurrentSublistValue({
                        sublistId: 'custpage_commission_sublist',
                        fieldId: 'custpage_total_value',
                        value: finalValue
                    });

                    rec.setCurrentSublistValue({
                        sublistId: 'custpage_commission_sublist',
                        fieldId: 'custpage_sales_rep',
                        value: repVendas
                    });

                    rec.commitLine({
                        sublistId: 'custpage_commission_sublist'
                    });
                }
            }

            lerComissaoSublista(rec)
            lerEdicaoValoresSublista(rec)

            if (lineCount > 0 || lineCount2 > 0) {
                return true;
            } else {
                dialog.alert({
                    title: 'Atenção',
                    message: 'Uma das sublistas deve ter pelo menos um resultado.'
                });
                return false;
            }
        }

        function lerComissaoSublista(currentRecord) {
            const sublistId = 'custpage_commission_sublist';
            const lineCount = currentRecord.getLineCount({ sublistId });

            for (let i = 0; i < lineCount; i++) {
                const salesRep = currentRecord.getSublistValue({ sublistId, fieldId: 'custpage_sales_rep', line: i });
                const designatedRep = currentRecord.getSublistValue({ sublistId, fieldId: 'custpage_designated_rep', line: i });
                const invoice = currentRecord.getSublistValue({ sublistId, fieldId: 'custpage_invoice', line: i });
                const commissionRate = currentRecord.getSublistValue({ sublistId, fieldId: 'custpage_commission_rate', line: i });
                const totalValue = currentRecord.getSublistValue({ sublistId, fieldId: 'custpage_total_value', line: i });
                const nfseValue = currentRecord.getSublistValue({ sublistId, fieldId: 'custpage_nfse_value', line: i });

                currentRecord.selectNewLine({ sublistId: 'recmachcustrecord_tk_commission_query_adjustmen' });

                currentRecord.setCurrentSublistValue({ sublistId: 'recmachcustrecord_tk_commission_query_adjustmen', fieldId: 'custrecord_tk_doc_invoice_sl', value: invoice });
                currentRecord.setCurrentSublistValue({ sublistId: 'recmachcustrecord_tk_commission_query_adjustmen', fieldId: 'custrecord_tk_sales_representative_sl', value: salesRep });
                currentRecord.setCurrentSublistValue({ sublistId: 'recmachcustrecord_tk_commission_query_adjustmen', fieldId: 'custrecord_tk_designated_representative', value: designatedRep });
                currentRecord.setCurrentSublistValue({ sublistId: 'recmachcustrecord_tk_commission_query_adjustmen', fieldId: 'custrecord_tk_aliq_comiss', value: commissionRate });
                currentRecord.setCurrentSublistValue({ sublistId: 'recmachcustrecord_tk_commission_query_adjustmen', fieldId: 'custrecord_tk_value_amount', value: totalValue });
                currentRecord.setCurrentSublistValue({ sublistId: 'recmachcustrecord_tk_commission_query_adjustmen', fieldId: 'custrecord_vit_nfse_total', value: nfseValue });

                currentRecord.commitLine({ sublistId: 'recmachcustrecord_tk_commission_query_adjustmen' });
            }
        }


        function lerEdicaoValoresSublista(currentRecord) {
            const sublistId = 'custpage_edit_values_sublist';
            const lineCount = currentRecord.getLineCount({ sublistId });

            for (let i = 0; i < lineCount; i++) {
                const salesRep = currentRecord.getSublistValue({ sublistId, fieldId: 'custpage_sales_rep_teste', line: i });
                const description = currentRecord.getSublistValue({ sublistId, fieldId: 'custpage_description', line: i });
                const credit = currentRecord.getSublistValue({ sublistId, fieldId: 'custpage_credit', line: i });
                const debit = currentRecord.getSublistValue({ sublistId, fieldId: 'custpage_debit', line: i });
                const finalValue = currentRecord.getSublistValue({ sublistId, fieldId: 'custpage_final_value', line: i });

                currentRecord.selectNewLine({ sublistId: 'recmachcustrecord_tk_commission_query_edit_link' });

                currentRecord.setCurrentSublistValue({ sublistId: 'recmachcustrecord_tk_commission_query_edit_link', fieldId: 'custrecord_tk_descri_tx', value: description });
                currentRecord.setCurrentSublistValue({ sublistId: 'recmachcustrecord_tk_commission_query_edit_link', fieldId: 'custrecord_tk_rep_vendas', value: salesRep });
                currentRecord.setCurrentSublistValue({ sublistId: 'recmachcustrecord_tk_commission_query_edit_link', fieldId: 'custrecord_tk_credit_cr', value: credit });
                currentRecord.setCurrentSublistValue({ sublistId: 'recmachcustrecord_tk_commission_query_edit_link', fieldId: 'custrecord_tk_debit_cr', value: debit });
                currentRecord.setCurrentSublistValue({ sublistId: 'recmachcustrecord_tk_commission_query_edit_link', fieldId: 'custrecord_tk_final_value', value: finalValue });

                currentRecord.commitLine({ sublistId: 'recmachcustrecord_tk_commission_query_edit_link' });
            }
        }

        /**
         * Function to be executed when field is changed.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         * @param {string} scriptContext.fieldId - Field name
         * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
         * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
         *
         * @since 2015.2
         */
        function fieldChanged(scriptContext) {
            var rec = scriptContext.currentRecord;
            let sublistId = scriptContext.sublistId;
            let fieldId = scriptContext.fieldId;
            var isCheck = rec.getValue('custrecord_tk_select_all_ck');

            if (fieldId == "custrecord_tk_select_all_ck") {
                if (isCheck) {
                    var idsSalesRep = rec.getValue('custpage_tk_ids_sales_rep');

                    rec.setValue('custrecord_tk_sales_rep_ls', idsSalesRep);
                } else {
                    rec.setValue('custrecord_tk_sales_rep_ls', []);
                }
            }

            if (sublistId === 'custpage_edit_values_sublist') {
                if (fieldId === 'custpage_credit' || fieldId === 'custpage_debit') {
                    let credit = rec.getCurrentSublistValue({ sublistId: sublistId, fieldId: 'custpage_credit' }) || 0;
                    let debit = rec.getCurrentSublistValue({ sublistId: sublistId, fieldId: 'custpage_debit' }) || 0;

                    finalValue = credit - debit

                    // if (finalValue > 0)
                    rec.setCurrentSublistValue({ sublistId: sublistId, fieldId: 'custpage_final_value', value: finalValue });
                    // else
                    // rec.setCurrentSublistValue({ sublistId: sublistId, fieldId: 'custrecord_tk_final_value', value: 0 });

                }
            }
        }

        function validateLine(context) {
            if (context.sublistId === 'custpage_commission_sublist') {
                const currentRecord = context.currentRecord;
                const salesRepId = currentRecord.getCurrentSublistValue({
                    sublistId: 'custpage_commission_sublist',
                    fieldId: 'custpage_designated_rep'
                });
                console.log(salesRepId);

                if (salesRepId) {
                    var commision = getCommissionPercentage(salesRepId);
                    if (commision) {
                        const totalValue = currentRecord.getCurrentSublistValue({
                            sublistId: 'custpage_commission_sublist',
                            fieldId: 'custpage_nfse_value'
                        });

                        console.log(commision)
                        console.log((totalValue * commision) / 100)

                        currentRecord.setCurrentSublistValue({
                            sublistId: 'custpage_commission_sublist',
                            fieldId: 'custpage_total_value',
                            value: (totalValue * commision) / 100
                        });
                    } else {
                        dialog.alert({
                            title: 'Atenção',
                            message: 'O novo representante ainda não possui Regras de Cálculo de Comissão vinculadas.'
                        });

                        return false;
                    }
                } else {
                        //  dialog.alert({
                        //     title: 'Atenção',
                        //     message: 'Correção de Representante obrigatório'
                        // });

                        // return false;
                }
            };

            return true;
        }

        function getCommissionPercentage(salesRepId) {
            var searchResult = search.create({
                type: "customrecord_tk_commission_rules",
                filters: [
                    ["custrecord_tk_salesrep_ls", "anyof", salesRepId]
                ],
                columns: [
                    search.createColumn({ name: "custrecord_tk_commission_percentage_pc" })
                ]
            }).run().getRange({ start: 0, end: 1 });

            if (searchResult.length > 0) {
                return parseFloat(searchResult[0].getValue({ name: "custrecord_tk_commission_percentage_pc" }).replace('%', ''));
            }

            return null;
        }

        function executeSearch() {
            try {
                var record = currentRecord.get();
                var peridText = record.getText('custrecord_tk_perid_conta');
                var peridValue = record.getValue('custrecord_tk_perid_conta');
                var employeeId = record.getValue('custrecord_tk_sales_rep_ls');


                if (!employeeId[0]) {
                    dialog.alert({
                        title: 'Atenção',
                        message: 'Selecione um representante de vendas.'
                    });

                    return
                }

                const baseUrl = "https://11198682.app.netsuite.com/app/common/custom/custrecordentry.nl";
                const rectype = 7258;

                const finalUrl = `${baseUrl}?rectype=${rectype}&search=true` +
                    `&mesText=${encodeURIComponent(peridText)}` +
                    `&mesValue=${encodeURIComponent(peridValue)}` +
                    `&custrecord_employee=${encodeURIComponent(employeeId)}`;

                window.location.href = finalUrl;

                return;

                var filters = [
                    ["mainline", "is", "T"],
                    "AND",
                    ["custbody_tk_commission_amount", "greaterthan", "0.00"],
                    "AND",
                    ["custbody_tk_method_calculating_com_ls", "noneof", "@NONE@"],
                    "AND",
                    ["type", "anyof", "RtnAuth", "CuTrSale123", "CustInvc", "CuTrSale121"],
                    "AND",
                    ["custbody_tk_gerad_comission", "is", false],
                ];

                if (startDate)
                    filters.push("AND", ["trandate", "onorafter", startDate]);
                if (endDate)
                    filters.push("AND", ["trandate", "onorbefore", endDate]);
                if (employeeId[0])
                    filters.push("AND", ["salesrep", "anyof", employeeId]);

                var sublistMain = "recmachcustrecord_tk_commission_query_edit_link";
                var sublistAdjustment = "recmachcustrecord_tk_commission_query_adjustmen";


                removeAllLines('recmachcustrecord_tk_commission_query_edit_link');
                removeAllLines('recmachcustrecord_tk_commission_query_adjustmen');

                function removeAllLines(sublistId) {
                    var lineCount = record.getLineCount({ sublistId: sublistId });

                    for (var i = lineCount - 1; i >= 0; i--) {
                        record.removeLine({ sublistId: sublistId, line: i });
                    }
                }

                var ids = [];
                var invoiceSearch = search.create({
                    type: "transaction",
                    filters: filters,
                    columns: [
                        { name: "type", label: "Tipo" },
                        { name: "salesrep", label: "Representante de vendas" },
                        { name: "custbody_tk_commission_amount", label: "Valor da Comissão" },
                        { name: "amount", label: "Valor" }
                    ]
                });

                invoiceSearch.run().each(function (result) {
                    addInvoiceToSublist(result, sublistMain, ids);
                    addInvoiceToAdjustmentSublist(result, sublistAdjustment);
                    return true;
                });

                function addInvoiceToSublist(result, sublistId) {
                    var salesRep = result.getValue("salesrep");
                    console.log(ids.indexOf(salesRep))
                    if (ids.indexOf(salesRep) == -1) {
                        record.selectNewLine({ sublistId: sublistId });

                        setSublistValue(sublistId, "custrecord_tk_rep_vendas", salesRep);

                        record.commitLine({ sublistId: sublistId });

                        ids.push(salesRep);
                    }
                }

                function addInvoiceToAdjustmentSublist(result, sublistId) {
                    var invoiceId = result.id;
                    var type = result.getValue("type");
                    var salesRep = result.getValue("salesrep");
                    var totalValue = result.getValue("amount");
                    var commissionAmount = result.getValue("custbody_tk_commission_amount") || "0.00";

                    if (type != 'CustInvc')
                        commissionAmount = commissionAmount * -1;

                    record.selectNewLine({ sublistId: sublistId });

                    console.log(getCommissionPercentage(salesRep))

                    setSublistValue(sublistId, "custrecord_tk_doc_invoice_sl", invoiceId);
                    setSublistValue(sublistId, "custrecord_tk_aliq_comiss", getCommissionPercentage(salesRep));
                    setSublistValue(sublistId, "custrecord_tk_sales_representative_sl", salesRep);
                    setSublistValue(sublistId, "custrecord_tk_value_amount", commissionAmount);

                    record.commitLine({ sublistId: sublistId });
                }

                /**
                * Retorna o percentual de comissão do representante informado
                * @param {string|number} salesRepId - ID interno do representante de vendas
                * @returns {string|null} - Valor do percentual de comissão ou null se não encontrar
                */
                function getCommissionPercentage(salesRepId) {
                    var searchResult = search.create({
                        type: "customrecord_tk_commission_rules",
                        filters: [
                            ["custrecord_tk_salesrep_ls", "anyof", salesRepId]
                        ],
                        columns: [
                            search.createColumn({ name: "custrecord_tk_commission_percentage_pc" })
                        ]
                    }).run().getRange({ start: 0, end: 1 });

                    if (searchResult.length > 0) {
                        return parseFloat(searchResult[0].getValue({ name: "custrecord_tk_commission_percentage_pc" }).replace('%', ''));
                    }

                    return null;
                }


                function setSublistValue(sublistId, fieldId, value) {
                    record.setCurrentSublistValue({
                        sublistId: sublistId,
                        fieldId: fieldId,
                        value: value
                    });
                }

            } catch (error) {
                alert(error.message);
            };
        };

        function pageInit() {
            var div = document.getElementById("custom4098_wrapper");
            if (div) {
                div.style.display = "none";
            }

            var tabDiv = document.querySelector('.uir-tab-list-tabs');
            if (tabDiv) {
                tabDiv.style.display = 'none';
            }


            var tabDiv = document.querySelector('.uir-tab-list');
            if (tabDiv) {
                tabDiv.style.display = 'none';
            }

        }


        return {
            pageInit: pageInit,
            saveRecord: saveRecord,
            fieldChanged: fieldChanged,
            executeSearch: executeSearch,
            validateLine: validateLine
        };

    });
